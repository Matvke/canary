import { Mic, MicOff } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

interface VoiceInputButtonProps {
  disabled?: boolean
  onResult: (text: string) => void
}

export function VoiceInputButton({ disabled, onResult }: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false)

  const supported = typeof window !== 'undefined'
    && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function handleStart(): void {
    if (!supported || disabled || listening) {
      return
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'ru-RU'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    setListening(true)

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()

      if (transcript) {
        onResult(transcript)
      }
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognition.start()
  }

  return (
    <Button
      type="button"
      variant={listening ? 'destructive' : 'outline'}
      size="sm"
      disabled={!supported || disabled}
      onClick={handleStart}
      className="h-11 rounded-2xl px-4"
      title={supported ? 'Надиктовать текст' : 'Голосовой ввод недоступен в этом браузере'}
    >
      {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      {listening ? 'Слушаю' : 'Голос'}
    </Button>
  )
}
