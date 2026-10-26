#!/usr/bin/env python3
"""
Enregistre en MP3 tous les textes de tools/texts.json avec les voix neuronales Edge
→ audio/<hash>.mp3 + audio/index.json (+ une liste par langue). Les fichiers déjà présents ne sont pas refaits.

Usage :  node tools/collect_texts.js && python3 tools/generate_audio.py
Le hash doit rester identique à audioKey() dans app.js (« fr-FR|texte ») (FNV-1a 32 bits de « lang|texte »).
"""
import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
TEXTS = ROOT / "tools" / "texts.json"
OUT = ROOT / "audio"
VOICES = {"fr-FR": "fr-FR-DeniseNeural"}
RATE = "-12%"  # un peu plus lent, pour les enfants
CONCURRENCY = 8


def audio_key(text: str, lang: str) -> str:
    h = 0x811C9DC5
    for b in f"{lang}|{text.strip()}".encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


async def generate(text: str, voice: str, path: Path) -> None:
    audio = b""
    async for chunk in edge_tts.Communicate(text, voice, rate=RATE).stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
    if not audio:
        raise RuntimeError("audio vide")
    path.write_bytes(audio)


async def main() -> None:
    OUT.mkdir(exist_ok=True)
    texts = json.loads(TEXTS.read_text())
    keys = {}
    for lang, text in texts:
        key = audio_key(text, lang)
        if key in keys and keys[key] != (lang, text):
            raise SystemExit(f"Collision de hash : {keys[key]} / {(lang, text)}")
        keys[key] = (lang, text)

    todo = [(k, l, t) for k, (l, t) in keys.items() if not (OUT / f"{k}.mp3").exists()]
    print(f"{len(keys)} textes, {len(todo)} à enregistrer")
    sem = asyncio.Semaphore(CONCURRENCY)
    done = failed = 0

    async def worker(key, lang, text):
        nonlocal done, failed
        async with sem:
            for attempt in range(4):
                try:
                    await generate(text, VOICES[lang], OUT / f"{key}.mp3")
                    break
                except Exception as e:
                    if attempt == 3:
                        failed += 1
                        print(f"ÉCHEC {lang} « {text} » : {e}")
                    await asyncio.sleep(2 * (attempt + 1))
            done += 1
            if done % 250 == 0:
                print(f"  {done}/{len(todo)}")

    await asyncio.gather(*(worker(*item) for item in todo))
    present = sorted(k for k in keys if (OUT / f"{k}.mp3").exists())
    (OUT / "index.json").write_text(json.dumps(present))
    for voice_lang in VOICES:
        (OUT / f"index-{voice_lang}.json").write_text(json.dumps([k for k in present if keys[k][0] == voice_lang]))
    print(f"Terminé : {len(present)} fichiers audio, {failed} échec(s)")


if __name__ == "__main__":
    asyncio.run(main())
