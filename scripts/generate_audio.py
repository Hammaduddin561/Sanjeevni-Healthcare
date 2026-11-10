import os
import math
import struct
import wave
import random

AUDIO_DIR = "frontend/public/sounds"
os.makedirs(AUDIO_DIR, exist_ok=True)

# 1. Generate Ambient Drone (Synthesized)
AMBIENT_PATH = os.path.join(AUDIO_DIR, "ambient.wav")
print(f"Generating ambient drone to {AMBIENT_PATH}...")
try:
    sample_rate = 22050 # Lower sample rate for ambient is fine/retro
    duration = 5.0 # 5 seconds loop
    volume = 0.3
    n_frames = int(sample_rate * duration)
    
    with wave.open(AMBIENT_PATH, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        data = bytearray()
        # Super simple additive synthesis: 3 low sine waves
        freq1 = 110.0 # A2
        freq2 = 112.0 # Detuned
        freq3 = 55.0  # A1
        
        # Pre-calc constants
        pi2 = 2.0 * math.pi
        
        for i in range(n_frames):
            t = i / sample_rate
            # Modulate amplitude slightly for movement
            lfo = 0.8 + 0.2 * math.sin(pi2 * 0.5 * t)
            
            val = math.sin(pi2 * freq1 * t) + \
                  0.5 * math.sin(pi2 * freq2 * t) + \
                  0.8 * math.sin(pi2 * freq3 * t)
            
            # Normalize approx /3 -> range -1 to 1
            val /= 2.5
            val *= lfo
            
            value = int(volume * 32767.0 * val)
            data += struct.pack('<h', value)
        wav_file.writeframes(data)
    print("Ambient drone generated.")
except Exception as e:
    print(f"Failed to generate ambient: {e}")

# ... (Previous generators for click/whoosh kept for completeness/regeneration) ...
CLICK_PATH = os.path.join(AUDIO_DIR, "click.wav")
print(f"Generating click sound to {CLICK_PATH}...")
try:
    with wave.open(CLICK_PATH, 'w') as wav_file:
        wav_file.setnchannels(1) 
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        data = bytearray()
        for i in range(int(44100 * 0.05)):
            t = i / 44100
            freq = 2000.0 - (1000.0 * t / 0.05)
            value = int(0.5 * 32767.0 * math.sin(2.0 * math.pi * freq * t))
            data += struct.pack('<h', value)
        wav_file.writeframes(data)
    print("Click sound generated.")
except Exception: pass

WHOOSH_PATH = os.path.join(AUDIO_DIR, "whoosh.wav")
print(f"Generating whoosh sound to {WHOOSH_PATH}...")
try:
    with wave.open(WHOOSH_PATH, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        data = bytearray()
        duration = 0.3
        for i in range(int(44100 * duration)):
            t = i / 44100
            noise = random.uniform(-1, 1)
            envelope = math.sin(math.pi * t / duration)
            value = int(0.3 * 32767.0 * noise * envelope)
            data += struct.pack('<h', value)
        wav_file.writeframes(data)
    print("Whoosh sound generated.")
except Exception: pass
