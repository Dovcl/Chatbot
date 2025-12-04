// LLM API 클라이언트 모듈
// OpenAI, Anthropic 등 다양한 LLM 제공자를 지원

class LLMClient {
    constructor(config) {
        // 지원하는 제공자: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'huggingface' | 'openrouter' | 'ollama' | 'custom'
        this.provider = config?.provider || 'openai';
        this.apiKey = config?.apiKey || '';
        this.model = config?.model || 'gpt-4o-mini';
        this.baseURL = config?.baseURL || null; // 커스텀 엔드포인트용
        this.maxTokens = config?.maxTokens || 2000;
        this.temperature = config?.temperature || 0.7;
    }

    /**
     * LLM을 사용하여 답변 생성 (RAG 패턴)
     * @param {string} question - 사용자 질문
     * @param {Array} contextData - 검색된 데이터 (컨텍스트)
     * @param {Object} metadata - 추가 메타데이터 (타겟 컬럼, 필터 조건 등)
     * @returns {Promise<string>} LLM이 생성한 답변
     */
    async generateAnswer(question, contextData = [], metadata = {}) {
        if (!this.apiKey) {
            throw new Error('LLM API 키가 설정되지 않았습니다. config.js에서 LLM_API_KEY를 설정해주세요.');
        }

        // 시스템 프롬프트 생성
        const systemPrompt = this.buildSystemPrompt(metadata);
        
        // 사용자 프롬프트 생성 (컨텍스트 포함)
        const userPrompt = this.buildUserPrompt(question, contextData, metadata);

        try {
            let response;
            
            switch (this.provider) {
                case 'openai':
                    response = await this.callOpenAI(systemPrompt, userPrompt);
                    break;
                case 'anthropic':
                    response = await this.callAnthropic(systemPrompt, userPrompt);
                    break;
                case 'gemini':
                    response = await this.callGemini(systemPrompt, userPrompt);
                    break;
                case 'groq':
                    response = await this.callGroq(systemPrompt, userPrompt);
                    break;
                case 'huggingface':
                    response = await this.callHuggingFace(systemPrompt, userPrompt);
                    break;
                case 'openrouter':
                    response = await this.callOpenRouter(systemPrompt, userPrompt);
                    break;
                case 'ollama':
                    response = await this.callOllama(systemPrompt, userPrompt);
                    break;
                case 'custom':
                    response = await this.callCustomAPI(systemPrompt, userPrompt);
                    break;
                default:
                    throw new Error(`지원하지 않는 LLM 제공자: ${this.provider}`);
            }

            return response;
        } catch (error) {
            console.error('LLM API 호출 오류:', error);
            throw new Error(`LLM 답변 생성 실패: ${error.message}`);
        }
    }

    /**
     * 시스템 프롬프트 생성
     */
    buildSystemPrompt(metadata) {
        return `당신은 환경 데이터 분석 전문가 챗봇입니다. 수질, 녹조, 수문, 기상 데이터를 분석하고 사용자에게 친절하고 전문적인 답변을 제공합니다.

주요 역할:
1. 검색된 데이터를 바탕으로 정확하고 자연스러운 답변 생성
2. 수질 등급, 조류 경보 단계 등 전문 지식 활용
3. 경고가 있을 때는 대응 메뉴얼의 구체적인 조치 방법을 제시
4. 사용자가 추가로 궁금해할 만한 정보를 능동적으로 제안
5. 데이터가 없을 때는 친절하게 안내

중요: 경고가 있고 대응 메뉴얼이 제공되면, 단순히 "메뉴얼을 참고하세요"라고 말하지 말고, 메뉴얼 내용을 바탕으로 구체적인 조치 방법을 직접 설명해주세요.

답변 스타일:
- 한국어로 자연스럽고 친절하게 답변
- 전문 용어는 간단히 설명
- 숫자와 단위를 명확히 표시
- 이모지를 적절히 사용하여 가독성 향상
- 데이터 기반으로 객관적인 분석 제공

수질 등급 기준:
- I등급: 매우 좋음 (pH 6.5-8.5, BOD ≤1.0, T-N ≤0.2, T-P ≤0.02)
- II등급: 좋음 (pH 6.0-9.0, BOD ≤2.0, T-N ≤0.3, T-P ≤0.04)
- III등급: 보통 (pH 5.5-9.5, BOD ≤3.0, T-N ≤0.5, T-P ≤0.1)
- IV등급: 나쁨 (pH 5.0-10.0, BOD ≤5.0, T-N ≤1.0, T-P ≤0.2)
- V등급: 매우 나쁨

조류 경보 단계:
- 정상: FAI < 40
- 관심: 40 ≤ FAI < 60
- 주의: 60 ≤ FAI < 80
- 경보: FAI ≥ 80`;
    }

    /**
     * 사용자 프롬프트 생성 (컨텍스트 데이터 포함)
     */
    buildUserPrompt(question, contextData, metadata) {
        let prompt = `사용자 질문: ${question}\n\n`;

        if (contextData && contextData.length > 0) {
            prompt += `=== 검색된 데이터 (${contextData.length}개) ===\n\n`;
            
            // 데이터를 JSON 형식으로 포맷팅
            contextData.slice(0, 10).forEach((row, index) => {
                prompt += `[데이터 ${index + 1}]\n`;
                Object.keys(row).forEach(key => {
                    prompt += `  ${key}: ${row[key]}\n`;
                });
                prompt += `\n`;
            });

            if (contextData.length > 10) {
                prompt += `... 외 ${contextData.length - 10}개 더 있습니다.\n\n`;
            }
        } else {
            prompt += `⚠️ 검색된 데이터가 없습니다. 사용자에게 데이터를 찾을 수 없다고 안내하고, 검색 조건을 확인하도록 제안해주세요.\n\n`;
        }

        if (metadata.targetColumns && metadata.targetColumns.length > 0) {
            prompt += `사용자가 관심 있는 지표: ${metadata.targetColumns.join(', ')}\n\n`;
        }

        if (metadata.queryConditions && Object.keys(metadata.queryConditions).length > 0) {
            prompt += `검색 조건:\n`;
            Object.entries(metadata.queryConditions).forEach(([key, value]) => {
                prompt += `  - ${key}: ${value}\n`;
            });
            prompt += `\n`;
        }

        // 경고 정보 추가
        if (metadata.alerts && metadata.alerts.length > 0) {
            prompt += `=== 경고 알림 (중요!) ===\n\n`;
            metadata.alerts.forEach((alert, index) => {
                prompt += `${index + 1}. ${alert.message}\n`;
                if (alert.manual) {
                    prompt += `   💡 대응 메뉴얼: ${alert.manual.title}\n`;
                }
            });
            prompt += `\n`;
            
            // 메뉴얼 내용 추가 (구체적인 조치 방법)
            if (metadata.manuals && metadata.manuals.length > 0) {
                prompt += `=== 대응 메뉴얼 (구체적인 조치 방법) ===\n\n`;
                metadata.manuals.forEach((manual, index) => {
                    prompt += `[메뉴얼 ${index + 1}] ${manual.title}\n`;
                    prompt += `${manual.content}\n\n`;
                });
                prompt += `⚠️ 위 메뉴얼 내용을 참고하여 구체적인 조치 방법을 제시해주세요. 단순히 "메뉴얼을 참고하세요"가 아니라, 실제로 어떤 조치를 해야 하는지 구체적으로 설명해주세요.\n\n`;
            }
            
            prompt += `⚠️ 위 경고 정보를 답변에 자연스럽게 포함해주세요. 경고가 있으면 반드시 언급하고, 메뉴얼 내용을 바탕으로 구체적인 조치 방법을 제시해주세요.\n\n`;
        }

        prompt += `위 데이터를 바탕으로 사용자 질문에 대해 자연스럽고 전문적인 답변을 생성해주세요. 
데이터가 있으면 구체적인 수치를 언급하고, 수질 등급이나 조류 경보 단계가 있다면 계산하여 포함해주세요.
경고 정보가 있으면 자연스럽게 답변에 포함시켜 주의를 환기시켜주세요.
추가로 확인하면 좋을 정보도 제안해주세요.`;

        return prompt;
    }

    /**
     * OpenAI API 호출
     */
    async callOpenAI(systemPrompt, userPrompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            throw new Error(`OpenAI API 오류: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    /**
     * Anthropic Claude API 호출
     */
    async callAnthropic(systemPrompt, userPrompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.model || 'claude-3-5-sonnet-20241022',
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            throw new Error(`Anthropic API 오류: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text.trim();
    }

    /**
     * Google Gemini API 호출 (무료 티어 제공)
     */
    async callGemini(systemPrompt, userPrompt) {
        const apiKey = this.apiKey;
        if (!apiKey) {
            throw new Error('Gemini API 키가 필요합니다. https://makersuite.google.com/app/apikey 에서 발급받으세요.');
        }

        // Gemini는 system prompt를 user prompt에 포함
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model || 'gemini-pro'}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: this.maxTokens,
                    temperature: this.temperature
                }
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            throw new Error(`Gemini API 오류: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    }

    /**
     * Groq API 호출 (무료 티어, 매우 빠름)
     */
    async callGroq(systemPrompt, userPrompt) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model || 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            throw new Error(`Groq API 오류: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    /**
     * Hugging Face Inference API 호출 (일부 모델 무료)
     */
    async callHuggingFace(systemPrompt, userPrompt) {
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        
        const response = await fetch(`https://api-inference.huggingface.co/models/${this.model || 'mistralai/Mistral-7B-Instruct-v0.2'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
            },
            body: JSON.stringify({
                inputs: fullPrompt,
                parameters: {
                    max_new_tokens: this.maxTokens,
                    temperature: this.temperature,
                    return_full_text: false
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Hugging Face API 오류: ${error || response.statusText}`);
        }

        const data = await response.json();
        // Hugging Face 응답 형식 처리
        if (Array.isArray(data) && data[0]?.generated_text) {
            return data[0].generated_text.trim();
        } else if (data.generated_text) {
            return data.generated_text.trim();
        } else if (typeof data === 'string') {
            return data.trim();
        }
        throw new Error('Hugging Face API 응답 형식 오류');
    }

    /**
     * OpenRouter API 호출 (다양한 모델, 일부 무료)
     */
    async callOpenRouter(systemPrompt, userPrompt) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': window.location.origin, // 선택사항
                'X-Title': '환경 데이터 챗봇' // 선택사항
            },
            body: JSON.stringify({
                model: this.model || 'openai/gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            throw new Error(`OpenRouter API 오류: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    /**
     * Ollama API 호출 (로컬 실행, 완전 무료)
     */
    async callOllama(systemPrompt, userPrompt) {
        const baseURL = this.baseURL || 'http://localhost:11434';
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        const response = await fetch(`${baseURL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model || 'llama2',
                prompt: fullPrompt,
                stream: false,
                options: {
                    num_predict: this.maxTokens,
                    temperature: this.temperature
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API 오류: ${error || response.statusText}`);
        }

        const data = await response.json();
        return data.response.trim();
    }

    /**
     * 커스텀 API 호출 (예: 자체 LLM 서버)
     */
    async callCustomAPI(systemPrompt, userPrompt) {
        if (!this.baseURL) {
            throw new Error('커스텀 API를 사용하려면 baseURL이 필요합니다.');
        }

        const response = await fetch(this.baseURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined
            },
            body: JSON.stringify({
                system_prompt: systemPrompt,
                user_prompt: userPrompt,
                model: this.model,
                max_tokens: this.maxTokens,
                temperature: this.temperature
            })
        });

        if (!response.ok) {
            throw new Error(`커스텀 API 오류: ${response.statusText}`);
        }

        const data = await response.json();
        // 커스텀 API 응답 형식에 맞게 조정 필요
        return data.response || data.text || data.content || JSON.stringify(data);
    }
}

// 싱글톤 인스턴스 생성 함수
export function createLLMClient(config) {
    return new LLMClient(config);
}

// 기본 인스턴스 (config.js에서 설정 로드)
export function getLLMClient() {
    const llmConfig = window.CONFIG?.LLM || {};
    
    if (!llmConfig.enabled) {
        return null; // LLM이 비활성화된 경우
    }

    const provider = llmConfig.provider || 'groq';
    
    // provider별 기본 모델 설정
    const defaultModels = {
        'groq': 'llama-3.1-8b-instant',
        'gemini': 'gemini-pro',
        'huggingface': 'mistralai/Mistral-7B-Instruct-v0.2',
        'openrouter': 'openai/gpt-3.5-turbo',
        'ollama': 'llama2',
        'openai': 'gpt-4o-mini',
        'anthropic': 'claude-3-5-sonnet-20241022',
        'custom': 'custom-model'
    };

    return new LLMClient({
        provider: provider,
        apiKey: llmConfig.apiKey || '',
        model: llmConfig.model || defaultModels[provider] || 'gpt-4o-mini',
        baseURL: llmConfig.baseURL || (provider === 'ollama' ? 'http://localhost:11434' : null),
        maxTokens: llmConfig.maxTokens || 2000,
        temperature: llmConfig.temperature || 0.7
    });
}

export default LLMClient;

