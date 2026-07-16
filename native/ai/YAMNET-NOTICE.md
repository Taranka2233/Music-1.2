# YAMNet model notice

`yamnet.tflite` is the official MediaPipe Audio Classifier YAMNet model:

https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite

SHA-256: `4d8b4a53282dc83ef04e3e7dbc4fbc98082e34e44ed798e16c3a0cdd4c584faf`

YAMNet predicts 521 AudioSet classes and is based on the TensorFlow Models
YAMNet implementation, distributed under Apache License 2.0:

https://github.com/tensorflow/models/tree/master/research/audioset/yamnet

The model is used only for on-device inference. Audio is not uploaded.
The binary is downloaded by `scripts/fetch-yamnet.mjs` during the build and is
accepted only when the SHA-256 above matches.
