import { GoogleGenAI, Content } from "@google/genai";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export const customizeScript = async (currentScript: string, prompt: string): Promise<string> => {
  const ai = getAIClient();
  const fullPrompt = `
    You are an expert Python developer. 
    Here is a Python script:
    \`\`\`python
    ${currentScript}
    \`\`\`
    
    User Request: "${prompt}"
    
    Task: Modify the script according to the user request. 
    Constraint: Return ONLY the full, valid Python code. Do not wrap it in markdown code blocks if possible, or I will strip them. 
    Do not add explanations.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
  });

  let text = response.text || "";
  // Clean up markdown code blocks if present
  text = text.replace(/^```python\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
  return text.trim();
};

export const analyzeLogs = async (logs: string): Promise<string> => {
  const ai = getAIClient();
  const prompt = `
    You are a DevOps engineer analyzing logs from a mock SRA Validator tool.
    
    Logs:
    ${logs}
    
    Task: Provide a brief, professional summary of the validation run. Mention the Accession ID, Status, and any anomalies (WARNs/ERRORs).
    Keep it under 3 sentences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Analysis failed.";
};

export const getChatResponse = async (history: Content[], newMessage: string): Promise<string> => {
  const ai = getAIClient();
  
  const systemInstruction = `
    You are an expert bioinformatician and guide for the National Center for Biotechnology Information (NCBI) and National Library of Medicine (NLM). 
                  
    Your goal is to help users understand:
    - SRA Toolkit usage and commands (prefetch, fasterq-dump, etc.)
    - DNA sequencing technologies (Illumina, PacBio, Nanopore)
    - Metagenomics and genomic data analysis
    - Bio.Entrez and Python automation for NCBI
    - General biology and genetics concepts related to the NLM databases.

    Be concise, technical but accessible, and provide code snippets where relevant (e.g., Python, Bash).

    IMPORTANT: At the very end of your response, strictly provide 3 short, relevant follow-up questions for the user in this specific JSON format:
    $$SUGGESTIONS$$ ["Question 1", "Question 2", "Question 3"]
    Do not include this JSON block in the main body of your text, only at the very end.
  `;

  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "I encountered an error processing your request.";
};