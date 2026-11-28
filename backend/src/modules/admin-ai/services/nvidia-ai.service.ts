import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NvidiaChatOptions {
  model?: string;
  max_tokens?: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
  temperature?: number;
  stream?: boolean;
}

@Injectable()
export class NvidiaAiService {
  private readonly logger = new Logger(NvidiaAiService.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1';
    this.apiKey = this.configService.get<string>('NVIDIA_API_KEY');
    this.defaultModel = this.configService.get<string>('NVIDIA_MODEL') || 'moonshotai/kimi-k3.1-pro';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async chat(messages: ChatCompletionMessage[], options?: NvidiaChatOptions): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('NVIDIA_API_KEY is not configured in backend environment');
    }

    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const model = options?.model || this.defaultModel;

    const payload = {
      model,
      messages,
      max_tokens: options?.max_tokens ?? 16384,
      seed: 0,
      stream: false,
      reasoning_effort: options?.reasoning_effort ?? 'low',
      temperature: options?.temperature ?? 0.2,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(`NVIDIA API HTTP ${response.status}: ${errorText}`);
        throw new Error(`NVIDIA API error: HTTP ${response.status}`);
      }

      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content || '';
      return content;
    } catch (err: any) {
      this.logger.error(`Failed to call NVIDIA NIM endpoint: ${err.message}`);
      throw err;
    }
  }
}
