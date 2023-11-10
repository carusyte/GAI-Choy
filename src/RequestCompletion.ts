/* eslint-disable */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { workspace } from "vscode";
import { translate } from "./LanguageHelper";
export interface CompletionResponse {
    "generated_text"?: string;
}
export interface OpenAiCompletionResponse {
    "id": string;
    "object": string;
    "created": number;
    "model": string;
    "usage": object;
    "choices": [
        {
            "message": {
                "role": string,
                "content": string
            },
            "finish_reason": string,
            "index": number
        }
    ]
}

export async function postCompletion(fileName: string, fimPrefixCode: string, fimSuffixCode: string): Promise<string | undefined> {
    const serverAddress = workspace.getConfiguration("CodeShell").get("ServerAddress") as string;
    let maxtokens = workspace.getConfiguration("CodeShell").get("CompletionMaxTokens") as number;
    const modelEnv = workspace.getConfiguration("CodeShell").get("RunEnvForLLMs") as string;
    const api_key = workspace.getConfiguration("CodeShell").get("ApiKey") as string;
    const model = workspace.getConfiguration("CodeShell").get("ChatModel") as string;
    const api_version = workspace.getConfiguration("CodeShell").get("ApiVersion") as string;
    
    if ("Azure OpenAI" == modelEnv) {
        const prompt = `${fimPrefixCode}${fimSuffixCode}`;
        let headers = {
            "Content-Type": "application/json",
            "api-key": api_key
        }
        // ### output_code: <the missing pieces of code fragment or snippet that you, as the assistant is to generate >
        let data = {
            "temperature": 0.5,
            "messages": [
                {
                    "role": "system",
                    "content": `Your role is an AI code interpreter.
                        Your task is to complete executable and functional code fragments based on the context provided by the user.
                        The context and metadata of the code fragment will be provided by user in the following format,
                        as delimited by triple quotes:
                        '''
                        ### file_name: <the file name of the program including file extension, which indicates the program type>
                        ### input_prefix: <prefix of the code fragment>
                        ### input_suffix: <suffix of the code fragment>
                        '''
                        Your mission is to generate code fragments or snippets that completes the code based on given context.
                        Expectation of the output format:
                        - Return the code fragments or snippets which can be inserted into the programe file directly and fill in the missing pieces.
                        - Don't respond in natural language. Just code.
                        - Unless the file per se is a markdown file, don't wrap the returned code snippet or fragment inside markdown 
                          script such as fenced code block.
                        `
                },
                {
                    "role": "user",
                    "content": `
                        ### file_name: ${fileName}
                        ### input_prefix: ${fimPrefixCode}
                        ### input_suffix: ${fimSuffixCode}
                    `
                }
            ]
        };
        console.debug("request.data:", data)
        const uri = "/openai/deployments/" + model + "/chat/completions?api-version=" + api_version
        const response = await axiosInstance.post<OpenAiCompletionResponse>(serverAddress + uri, data, {headers: headers});
        console.debug("response.data:", response.data)
        return "\n" + response.data.choices[0].message.content;
    }

    if ("CPU with llama.cpp" == modelEnv) {
        let data = {
            "input_prefix": fimPrefixCode, "input_suffix": fimSuffixCode,
            "n_predict": maxtokens, "temperature": 0.2, "repetition_penalty": 1.0, "top_k": 10, "top_p": 0.95,
            "stop": ["|<end>|", "|end|", "<|endoftext|>", "## human"]
        };
        console.debug("request.data:", data)
        const response = await axiosInstance.post(serverAddress + "/infill", data);
        var content = "";
        const respData = response.data as string;
        const dataList = respData.split("\n\n");
        for (var chunk of dataList) {
            if (chunk.startsWith("data:")) {
                content += JSON.parse(chunk.substring(5)).content
            }
        }
        console.debug("response.data:", content)
        return content.replace("<|endoftext|>", "");
    }
    if ("GPU with TGI toolkit" == modelEnv) {
        const prompt = `<fim_prefix>${fimPrefixCode}<fim_suffix>${fimSuffixCode}<fim_middle>`;
        let data = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": maxtokens, "temperature": 0.2, "repetition_penalty": 1.2, "top_p": 0.99, "do_sample": true,
                "stop": ["|<end>|", "|end|", "<|endoftext|>", "## human"]
            }
        };
        console.debug("request.data:", data)
        const uri = "/generate"
        // const uri = "/codeshell-code/completion"
        const response = await axiosInstance.post<CompletionResponse>(serverAddress + uri, data);
        console.debug("response.data:", response.data)
        return response.data.generated_text?.replace("<|endoftext|>", "");
    }
}

const axiosInstance: AxiosInstance = axios.create({
    timeout: 60000,
    timeoutErrorMessage: translate("timeout")
});

axiosInstance.interceptors.request.use(
    (config: AxiosRequestConfig) => {
        return config;
    },
    (error: any) => {
        return Promise.reject(error);
    },
);

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: any) => {
        return Promise.reject(error);
    },
);