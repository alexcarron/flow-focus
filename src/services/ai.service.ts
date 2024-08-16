import { Injectable } from '@angular/core';
import { GenerateContentResult, GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root'
})
export class AIService {
	private static readonly API_KEY = 'YOUR_API_KEY_HERE';
	private generativeModel: GenerativeModel;
	private numGenerations: number = 0;

  constructor() {
		if (AIService.API_KEY === undefined) {
			throw new Error('GEMINI_API_KEY environment variable is not set');
		}
		const googleGenerativeAI = new GoogleGenerativeAI(AIService.API_KEY);
		this.generativeModel = googleGenerativeAI.getGenerativeModel({ model: "gemini-1.5-flash"});
	}

	/**
	 * Generates text based on the prompt
	 * @param prompt - the prompt to generate text
	 * @returns the generated text
	 */
	public async generateText(prompt: string): Promise<string> {
		if (this.numGenerations > 1) {
			return '';
		}

		const result: GenerateContentResult = await this.generativeModel.generateContent(prompt);
		const text = result.response.text();

		this.numGenerations++;

		return text;
	}
}
