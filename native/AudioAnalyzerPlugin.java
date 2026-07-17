package __PKG__;

import android.media.AudioFormat;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mediapipe.tasks.audio.audioclassifier.AudioClassifier;
import com.google.mediapipe.tasks.audio.audioclassifier.AudioClassifierResult;
import com.google.mediapipe.tasks.audio.core.RunningMode;
import com.google.mediapipe.tasks.components.containers.AudioData;
import com.google.mediapipe.tasks.components.containers.Category;
import com.google.mediapipe.tasks.components.containers.ClassificationResult;
import com.google.mediapipe.tasks.components.containers.Classifications;
import com.google.mediapipe.tasks.core.BaseOptions;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Локальный анализ музыки. Декодирует короткий фрагмент content:// в PCM,
 * прогоняет его через YAMNet на устройстве и наружу отдаёт только метки.
 * Аудиоданные не покидают телефон.
 */
@CapacitorPlugin(name = "AudioAnalyzer")
public class AudioAnalyzerPlugin extends Plugin {

    private static final int TARGET_RATE = 16_000;
    private static final long CLIP_US = 12_000_000L;
    private static final int MODEL_VERSION = 1;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private AudioClassifier classifier;

    private static final Map<String, String> GENRES = labels(new String[][] {
        {"Pop music", "ПОП"}, {"Hip hop music", "ХИП-ХОП"}, {"Beatboxing", "ХИП-ХОП"},
        {"Rock music", "РОК"}, {"Rock and roll", "РОК"}, {"Progressive rock", "ПРОГ-РОК"},
        {"Psychedelic rock", "ПСИХОДЕЛИЧЕСКИЙ РОК"}, {"Grunge", "ГРАНЖ"},
        {"Heavy metal", "МЕТАЛ"}, {"Punk rock", "ПАНК"},
        {"Rhythm and blues", "R&B"}, {"Soul music", "СОУЛ"}, {"Reggae", "РЕГГИ"},
        {"Country", "КАНТРИ"}, {"Bluegrass", "БЛЮГРАСС"}, {"Funk", "ФАНК"},
        {"Folk music", "ФОЛК"}, {"Jazz", "ДЖАЗ"}, {"Swing music", "СВИНГ"},
        {"Disco", "ДИСКО"}, {"Classical music", "КЛАССИКА"}, {"Opera", "ОПЕРА"},
        {"Electronic music", "ЭЛЕКТРОНИКА"}, {"Electronica", "ЭЛЕКТРОНИКА"},
        {"Electronic dance music", "EDM"}, {"House music", "ХАУС"}, {"Techno", "ТЕХНО"},
        {"Dubstep", "ДАБСТЕП"}, {"Drum and bass", "DRUM & BASS"}, {"Ambient music", "ЭМБИЕНТ"},
        {"Trance music", "ТРАНС"}, {"Blues", "БЛЮЗ"}, {"Ska", "СКА"},
        {"Music of Latin America", "ЛАТИН"}, {"Salsa music", "САЛЬСА"}, {"Flamenco", "ФЛАМЕНКО"},
        {"Middle Eastern music", "ВОСТОЧНАЯ"}, {"Music of Africa", "АФРИКАНСКАЯ"},
        {"Afrobeat", "АФРОБИТ"}, {"Music of Bollywood", "БОЛЛИВУД"},
        {"Gospel music", "ГОСПЕЛ"}, {"New-age music", "НЬЮ-ЭЙДЖ"},
        {"Independent music", "ИНДИ"}, {"Video game music", "ИГРОВАЯ"},
        {"Soundtrack music", "САУНДТРЕК"}, {"Dance music", "ТАНЦЕВАЛЬНАЯ"}
    });

    private static final Map<String, String> MOODS = labels(new String[][] {
        {"Happy music", "РАДОСТЬ"}, {"Sad music", "ГРУСТЬ"}, {"Tender music", "СПОКОЙСТВИЕ"},
        {"Exciting music", "ДРАЙВ"}, {"Angry music", "АГРЕССИЯ"}, {"Scary music", "ТРЕВОГА"},
        {"Lullaby", "СОН"}, {"Ambient music", "АТМОСФЕРА"}
    });

    private static final Map<String, String> INSTRUMENTS = labels(new String[][] {
        {"Guitar", "ГИТАРА"}, {"Electric guitar", "ЭЛЕКТРОГИТАРА"}, {"Acoustic guitar", "АКУСТИЧЕСКАЯ ГИТАРА"},
        {"Bass guitar", "БАС"}, {"Piano", "ФОРТЕПИАНО"}, {"Synthesizer", "СИНТЕЗАТОР"},
        {"Drum kit", "БАРАБАНЫ"}, {"Drum machine", "ДРАМ-МАШИНА"}, {"Violin, fiddle", "СКРИПКА"},
        {"String section", "СТРУННЫЕ"}, {"Saxophone", "САКСОФОН"}, {"Trumpet", "ТРУБА"},
        {"Flute", "ФЛЕЙТА"}, {"Organ", "ОРГАН"}, {"Orchestra", "ОРКЕСТР"}
    });

    private static Map<String, String> labels(String[][] rows) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String[] row : rows) out.put(row[0], row[1]);
        return Collections.unmodifiableMap(out);
    }

    @PluginMethod
    public void analyze(PluginCall call) {
        String raw = call.getString("uri");
        if (raw == null || raw.isEmpty()) {
            call.reject("Нет URI трека", "BAD_URI");
            return;
        }
        worker.execute(() -> {
            try {
                call.resolve(analyzeUri(Uri.parse(raw)));
            } catch (Exception e) {
                call.reject("AI-анализ не удался: " + safeMessage(e), "AI_FAIL", e);
            }
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        // Это не декоративная константа: реально открываем asset и создаём
        // интерпретатор. Поэтому «ГОТОВО» в интерфейсе означает живую модель.
        worker.execute(() -> {
            JSObject out = new JSObject();
            out.put("model", "YAMNet");
            out.put("version", MODEL_VERSION);
            out.put("offline", true);
            try {
                getClassifier();
                out.put("ready", true);
            } catch (Exception e) {
                out.put("ready", false);
                out.put("error", safeMessage(e));
            }
            call.resolve(out);
        });
    }

    private synchronized AudioClassifier getClassifier() {
        if (classifier == null) {
            BaseOptions base = BaseOptions.builder().setModelAssetPath("yamnet.tflite").build();
            AudioClassifier.AudioClassifierOptions options = AudioClassifier.AudioClassifierOptions.builder()
                .setBaseOptions(base)
                .setRunningMode(RunningMode.AUDIO_CLIPS)
                .setScoreThreshold(0.01f)
                .build();
            classifier = AudioClassifier.createFromOptions(getContext(), options);
        }
        return classifier;
    }

    private JSObject analyzeUri(Uri uri) throws Exception {
        Decoded decoded = decode(uri);
        float[] audio = resample(decoded.samples, decoded.sampleRate, TARGET_RATE);
        if (audio.length < TARGET_RATE / 2) throw new IllegalStateException("слишком мало аудиоданных");

        AudioData.AudioDataFormat format = AudioData.AudioDataFormat.builder()
            .setNumOfChannels(1).setSampleRate(TARGET_RATE).build();
        AudioData data = AudioData.create(format, audio.length);
        data.load(audio);
        AudioClassifierResult result = getClassifier().classify(data);

        Map<String, Double> sums = new HashMap<>();
        Map<String, Double> peaks = new HashMap<>();
        int frames = 0;
        for (ClassificationResult frame : result.classificationResults()) {
            if (frame.classifications().isEmpty()) continue;
            frames++;
            for (Classifications head : frame.classifications()) {
                for (Category c : head.categories()) {
                    String name = c.categoryName();
                    if (name == null || name.isEmpty()) name = c.displayName();
                    if (name == null || name.isEmpty()) continue;
                    double score = c.score();
                    sums.put(name, sums.getOrDefault(name, 0.0) + score);
                    peaks.put(name, Math.max(peaks.getOrDefault(name, 0.0), score));
                }
            }
        }
        if (frames == 0) throw new IllegalStateException("модель не вернула результатов");

        Map<String, Double> scores = new HashMap<>();
        for (Map.Entry<String, Double> e : sums.entrySet()) {
            double mean = e.getValue() / frames;
            scores.put(e.getKey(), mean * 0.7 + peaks.getOrDefault(e.getKey(), mean) * 0.3);
        }

        List<Scored> genres = ranked(scores, GENRES, 3, 0.025);
        List<Scored> moods = ranked(scores, MOODS, 3, 0.025);
        List<Scored> instruments = ranked(scores, INSTRUMENTS, 4, 0.035);
        double voice = max(scores, "Singing", "Choir", "Rapping", "Vocal music", "A capella", "Speech");
        double dance = max(scores, "Dance music", "Electronic dance music", "House music", "Disco", "Techno", "Trance music");

        JSObject out = new JSObject();
        out.put("version", MODEL_VERSION);
        out.put("model", "YAMNet");
        out.put("offline", true);
        out.put("genre", genres.isEmpty() ? "" : genres.get(0).name);
        out.put("confidence", genres.isEmpty() ? 0 : round(genres.get(0).score));
        out.put("genres", toJson(genres));
        out.put("moods", toJson(moods));
        out.put("instruments", toJson(instruments));
        out.put("energy", round(energy(audio)));
        out.put("voice", round(clamp(voice)));
        out.put("dance", round(clamp(dance)));
        out.put("bpm", estimateBpm(audio, TARGET_RATE));
        out.put("seconds", round(audio.length / (double) TARGET_RATE));
        out.put("analyzedAt", System.currentTimeMillis());
        return out;
    }

    private static List<Scored> ranked(Map<String, Double> scores, Map<String, String> map, int limit, double min) {
        Map<String, Double> combined = new HashMap<>();
        for (Map.Entry<String, String> e : map.entrySet()) {
            double value = scores.getOrDefault(e.getKey(), 0.0);
            if (value >= min) combined.put(e.getValue(), Math.max(combined.getOrDefault(e.getValue(), 0.0), value));
        }
        List<Scored> out = new ArrayList<>();
        for (Map.Entry<String, Double> e : combined.entrySet()) out.add(new Scored(e.getKey(), e.getValue()));
        out.sort(Comparator.comparingDouble((Scored x) -> x.score).reversed());
        return out.size() > limit ? new ArrayList<>(out.subList(0, limit)) : out;
    }

    private static JSArray toJson(List<Scored> rows) {
        JSArray out = new JSArray();
        for (Scored row : rows) {
            JSObject item = new JSObject(); item.put("name", row.name); item.put("score", round(row.score)); out.put(item);
        }
        return out;
    }

    private static double max(Map<String, Double> scores, String... keys) {
        double out = 0;
        for (String key : keys) out = Math.max(out, scores.getOrDefault(key, 0.0));
        return out;
    }

    private Decoded decode(Uri uri) throws Exception {
        MediaExtractor extractor = new MediaExtractor();
        MediaCodec codec = null;
        try {
            extractor.setDataSource(getContext(), uri, null);
            int track = -1;
            MediaFormat input = null;
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat f = extractor.getTrackFormat(i);
                String mime = f.getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.startsWith("audio/")) { track = i; input = f; break; }
            }
            if (track < 0 || input == null) throw new IllegalArgumentException("в файле нет аудиодорожки");
            String mime = input.getString(MediaFormat.KEY_MIME);
            if (mime == null) throw new IllegalArgumentException("формат аудио неизвестен");
            long duration = input.containsKey(MediaFormat.KEY_DURATION) ? input.getLong(MediaFormat.KEY_DURATION) : CLIP_US;
            if (duration <= 0) duration = CLIP_US; // у повреждённых контейнеров встречается -1
            long start = duration > CLIP_US + 2_000_000L ? Math.max(0, duration / 2 - CLIP_US / 2) : 0;
            long end = Math.min(duration, start + CLIP_US);

            extractor.selectTrack(track);
            if (start > 0) extractor.seekTo(start, MediaExtractor.SEEK_TO_PREVIOUS_SYNC);
            codec = MediaCodec.createDecoderByType(mime);
            codec.configure(input, null, null, 0);
            codec.start();

            int sampleRate = input.containsKey(MediaFormat.KEY_SAMPLE_RATE) ? input.getInteger(MediaFormat.KEY_SAMPLE_RATE) : 44_100;
            int channels = input.containsKey(MediaFormat.KEY_CHANNEL_COUNT) ? input.getInteger(MediaFormat.KEY_CHANNEL_COUNT) : 2;
            int encoding = AudioFormat.ENCODING_PCM_16BIT;
            FloatCollector pcm = new FloatCollector(Math.max(sampleRate * 4, 65_536));
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            boolean inputDone = false, outputDone = false;
            long timeoutAt = System.currentTimeMillis() + 45_000;

            while (!outputDone) {
                if (System.currentTimeMillis() > timeoutAt) throw new IllegalStateException("таймаут декодера");
                if (!inputDone) {
                    int index = codec.dequeueInputBuffer(10_000);
                    if (index >= 0) {
                        ByteBuffer buffer = codec.getInputBuffer(index);
                        if (buffer == null) throw new IllegalStateException("декодер не дал входной буфер");
                        buffer.clear();
                        long at = extractor.getSampleTime();
                        if (at < 0 || at > end) {
                            codec.queueInputBuffer(index, 0, 0, Math.max(0, at), MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                            inputDone = true;
                        } else {
                            int size = extractor.readSampleData(buffer, 0);
                            if (size < 0) {
                                codec.queueInputBuffer(index, 0, 0, Math.max(0, at), MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                                inputDone = true;
                            } else {
                                codec.queueInputBuffer(index, 0, size, at, extractor.getSampleFlags());
                                extractor.advance();
                            }
                        }
                    }
                }

                int outIndex = codec.dequeueOutputBuffer(info, 10_000);
                if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat f = codec.getOutputFormat();
                    if (f.containsKey(MediaFormat.KEY_SAMPLE_RATE)) sampleRate = f.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                    if (f.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) channels = f.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                    if (f.containsKey("pcm-encoding")) encoding = f.getInteger("pcm-encoding");
                } else if (outIndex >= 0) {
                    if (info.size > 0 && info.presentationTimeUs >= start && info.presentationTimeUs <= end) {
                        ByteBuffer buffer = codec.getOutputBuffer(outIndex);
                        if (buffer != null) {
                            buffer.position(info.offset);
                            buffer.limit(info.offset + info.size);
                            appendMono(buffer.slice().order(ByteOrder.LITTLE_ENDIAN), channels, encoding, pcm);
                        }
                    }
                    outputDone = (info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0;
                    codec.releaseOutputBuffer(outIndex, false);
                }
            }
            if (pcm.size < Math.max(1, sampleRate / 2)) throw new IllegalStateException("декодер вернул пустой PCM");
            return new Decoded(pcm.toArray(), sampleRate);
        } finally {
            try { if (codec != null) codec.stop(); } catch (Exception ignored) {}
            try { if (codec != null) codec.release(); } catch (Exception ignored) {}
            extractor.release();
        }
    }

    private static void appendMono(ByteBuffer b, int channels, int encoding, FloatCollector out) {
        channels = Math.max(1, channels);
        if (encoding == AudioFormat.ENCODING_PCM_FLOAT) {
            int frameBytes = 4 * channels;
            while (b.remaining() >= frameBytes) {
                float sum = 0; for (int c = 0; c < channels; c++) sum += b.getFloat();
                out.add(clampFloat(sum / channels));
            }
        } else if (encoding == AudioFormat.ENCODING_PCM_16BIT) {
            int frameBytes = 2 * channels;
            while (b.remaining() >= frameBytes) {
                float sum = 0; for (int c = 0; c < channels; c++) sum += b.getShort() / 32768f;
                out.add(clampFloat(sum / channels));
            }
        } else {
            throw new IllegalArgumentException("PCM-кодировка не поддерживается: " + encoding);
        }
    }

    private static float[] resample(float[] src, int from, int to) {
        if (from <= 0 || to <= 0 || src.length < 2) return src;
        if (from == to) return src;
        int n = Math.max(1, (int) Math.round(src.length * (to / (double) from)));
        float[] out = new float[n];
        double scale = (src.length - 1.0) / Math.max(1, n - 1);
        for (int i = 0; i < n; i++) {
            double p = i * scale; int a = (int) p; int z = Math.min(src.length - 1, a + 1);
            out[i] = (float) (src[a] + (src[z] - src[a]) * (p - a));
        }
        return out;
    }

    private static double energy(float[] audio) {
        double sum = 0; for (float v : audio) sum += v * v;
        double rms = Math.sqrt(sum / Math.max(1, audio.length));
        double db = 20 * Math.log10(Math.max(1e-7, rms));
        return clamp((db + 42) / 34);
    }

    /** Грубая оценка темпа по автокорреляции огибающей атак; 0 означает «не уверен». */
    private static int estimateBpm(float[] audio, int rate) {
        final int frame = 1024, hop = 256;
        int count = 1 + (audio.length - frame) / hop;
        if (count < 40) return 0;
        double[] onset = new double[count];
        double prev = 0, power = 0;
        for (int i = 0; i < count; i++) {
            double e = 0; int base = i * hop;
            for (int j = 0; j < frame; j++) e += audio[base + j] * audio[base + j];
            e = Math.log1p(e / frame * 10_000);
            onset[i] = Math.max(0, e - prev); prev = e; power += onset[i] * onset[i];
        }
        if (power < 1e-6) return 0;
        int lo = Math.max(1, (int) Math.floor(60.0 * rate / (200 * hop)));
        int hi = Math.min(count - 2, (int) Math.ceil(60.0 * rate / (60 * hop)));
        int bestLag = 0; double best = 0;
        for (int lag = lo; lag <= hi; lag++) {
            double corr = 0, norm = 0;
            for (int i = lag; i < count; i++) { corr += onset[i] * onset[i-lag]; norm += onset[i] * onset[i]; }
            if (norm > 0 && corr / norm > best) { best = corr / norm; bestLag = lag; }
        }
        if (bestLag == 0 || best < 0.08) return 0;
        double bpm = 60.0 * rate / (bestLag * hop);
        while (bpm < 75) bpm *= 2;
        while (bpm > 190) bpm /= 2;
        return (int) Math.round(bpm);
    }

    @Override
    protected void handleOnDestroy() {
        worker.shutdownNow();
        synchronized (this) {
            if (classifier != null) { classifier.close(); classifier = null; }
        }
        super.handleOnDestroy();
    }

    private static String safeMessage(Exception e) {
        return e.getMessage() == null || e.getMessage().isEmpty() ? e.getClass().getSimpleName() : e.getMessage();
    }
    private static float clampFloat(float v) { return Math.max(-1f, Math.min(1f, v)); }
    private static double clamp(double v) { return Math.max(0, Math.min(1, v)); }
    private static double round(double v) { return Math.round(v * 1000) / 1000.0; }

    private static final class Decoded {
        final float[] samples; final int sampleRate;
        Decoded(float[] samples, int sampleRate) { this.samples = samples; this.sampleRate = sampleRate; }
    }
    private static final class Scored {
        final String name; final double score;
        Scored(String name, double score) { this.name = name; this.score = score; }
    }
    private static final class FloatCollector {
        float[] values; int size;
        FloatCollector(int initial) { values = new float[Math.max(1024, initial)]; }
        void add(float v) {
            if (size == values.length) {
                float[] grown = new float[values.length + values.length / 2];
                System.arraycopy(values, 0, grown, 0, size); values = grown;
            }
            values[size++] = v;
        }
        float[] toArray() { float[] out = new float[size]; System.arraycopy(values, 0, out, 0, size); return out; }
    }
}
