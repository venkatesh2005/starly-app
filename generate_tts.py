import sys
from gtts import gTTS
import os

text_file = sys.argv[1]
output_file = sys.argv[2]

# Read the story text from file
with open(text_file, "r", encoding="utf-8") as f:
    text = f.read()

# Ensure output folder exists
os.makedirs(os.path.dirname(output_file), exist_ok=True)

# Generate TTS
tts = gTTS(text=text, lang='en')
tts.save(output_file)
