/* eslint-disable */
import { workspace } from "vscode";
import { FetchStream } from "./FetchStream";
import { ChatItem } from "./ChatMemory";
import AbortController from "abort-controller";

let abortController = new AbortController();

export async function stopEventStream() {
    abortController.abort();
}

export async function postEventStream(prompt: string, chatList: Array<ChatItem>, msgCallback: (data: string) => any, doneCallback: (data: Array<string>) => void, errorCallback: (err: any) => void) {
    const serverAddress = workspace.getConfiguration("CodeShell").get("ServerAddress") as string;
    const api_key = workspace.getConfiguration("CodeShell").get("ApiKey") as string;
    const model = workspace.getConfiguration("CodeShell").get("ChatModel") as string;
    const api_version = workspace.getConfiguration("CodeShell").get("ApiVersion") as string;
    const maxtokens = workspace.getConfiguration("CodeShell").get("ChatMaxTokens") as number;
    const modelEnv = workspace.getConfiguration("CodeShell").get("RunEnvForLLMs") as string;
    var uri = "";
    var body = {};
    var headers = {};

    if ("CPU with llama.cpp" == modelEnv) {
        uri = "/completion"
        headers = {
            "Content-Type": "application/json",
        };
        body = {
            "prompt": "|<end>|" + prompt, "n_predict": maxtokens, 
            "temperature": 0.8, "repetition_penalty": 1.2, "top_k":40,  "top_p":0.95, "stream": true, 
            "stop": ["|<end>|", "|end|", "<|endoftext|>", "## human"]
        };
    }
    if ("GPU with TGI toolkit" == modelEnv) {
        uri = "/generate_stream"
        // uri = "/codeshell-code/assistants"
        headers = {
            "Content-Type": "application/json",
        };
        body = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": maxtokens,
                "temperature": 0.6, "repetition_penalty": 1.2, "top_p": 0.95, "do_sample": true, 
                "stop": ["|<end>|", "|end|", "<|endoftext|>", "## human"]
            }
        };
    }
    if ("Azure OpenAI" == modelEnv) {
        uri = "/openai/deployments/" + model + "/chat/completions?api-version=" + api_version
        headers = {
            "Content-Type": "application/json",
            "api-key": api_key
        };
        body = {
            "temperature": 0.8,
            // "stream": true,
            // "model": model,
            // "max_tokens": maxtokens,
            // "stop": ["|<end>|", "|end|", "<|endoftext|>", "## human"],
            "messages": [
                {
                    "role": "system",
                    "content": "Your role is an AI paired programming assistant and technical consultant. Your task is to answer questions raised by the user as a developer."
                }
            ]
        };
        for (let item of chatList) {
            if (item.humanMessage.content.length > 0) {
                // @ts-ignore
                body.messages.push(
                    {
                        "role": "user",
                        "content": item.humanMessage.content
                    }
                )
            }
            if (item.aiMessage.content.length > 0) {
                // @ts-ignore
                body.messages.push(
                    {
                        "role": "assistant",
                        "content": item.aiMessage.content
                    }
                )
            }
        }
    }
    abortController = new AbortController();
    new FetchStream({
        url: serverAddress + uri,
        requestInit: {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
            signal: abortController.signal
        },
        onmessage: msgCallback,
        ondone: doneCallback,
        onerror: errorCallback
    });

}