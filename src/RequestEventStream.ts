/* eslint-disable */
import { Agent } from "https";
import { workspace } from "vscode";
import { FetchStream } from "./FetchStream";
import { ChatItem } from "./ChatMemory";
import { AzureOAI } from "./llm/AzureOAI";
import AbortController from "abort-controller";
import ExtensionResource from "./ExtensionResource";

let abortController = new AbortController();

export async function stopEventStream() {
    abortController.abort();
}

export async function postEventStream(prompt: string, chatList: Array<ChatItem>, msgCallback: (data: string) => any, doneCallback: (data: Array<string>) => void, errorCallback: (err: any) => void) {
    const serverAddress = workspace.getConfiguration("GAIChoy").get("ServerAddress") as string;
    const model = workspace.getConfiguration("GAIChoy").get("ChatModel") as string;
    const api_version = workspace.getConfiguration("GAIChoy").get("ApiVersion") as string;
    const maxtokens = workspace.getConfiguration("GAIChoy").get("ChatMaxTokens") as number;
    const modelEnv = workspace.getConfiguration("GAIChoy").get("RunEnvForLLMs") as string;
    const allowSelfSignedCert = workspace.getConfiguration("GAIChoy").get("AllowSelfSignedCert") as boolean
    const parameters = workspace.getConfiguration("GAIChoy").get("ApiParameters") as string;
    const reasoning_effort = workspace.getConfiguration("GAIChoy").get("ReasoningEffort") as string;
    const timeout = workspace.getConfiguration("GAIChoy").get("ApiTimeout") as number;

    // get API key from secret storage
    let api_key = await ExtensionResource.instance.getApiKey();
    if (api_key === null || api_key === undefined || api_key === '') {
        throw new Error("Azure OpenAI API key is not set. Please configure API key in extension settings.");
    }

    var uri = "";
    let body: {[key: string]: any} = {};
    var headers = {};

    if ("CPU with llama.cpp" == modelEnv) {
        uri = "/completion"
        headers = {
            "Content-Type": "application/json",
        };
        body = {
            "prompt": "|<end>|" + prompt, "n_predict": maxtokens,
            "temperature": 0.8, "repetition_penalty": 1.2, "top_k": 40, "top_p": 0.95, "stream": true,
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
            temperature: 0.8,
            messages: [
                {
                    role: (/^o1(-.*)?$/.test(model)) ? "developer" : "system",
                    // "content": `
                    //     Your role is an AI pair programming assistant and technical consultant, a programming expert with strong coding skills.
                    //     Your task is to answer questions raised by the user as a developer.
                    //     You can solve all kinds of programming problems.
                    //     You can design projects, code structures, and code files step by step with one click.
                    //     - Follow the user's requirements carefully and to the letter. If there's uncertainty, you can try rephrasing it, then extend the rephrased question, before responding.
                    //     - Answer in user's natural language.
                    //     - Don't use excessive line breaks between paragraphs.
                    //     - First think step-by-step, describe your plan for what to build in pseudocode, written out in great detail
                    //     - Then output the code in a single code block, and specify the language type for the code block.
                    //     - Minimize any other prose. Be concise.
                    //     - Wait for the users' instruction, be interactive to understand more about user's problem, such that you can provide effective answer.
                    //     - If the response extends beyond token limit, respond in multiple responses/messages so your responses aren't cutoff. Tell the user to print next or continue.
                    //     `
                    content: `You are an AI assistant named "GAI Choy" that helps people find information and satisfy their requests. Your response should be in markdown format.`
                }
            ]
            // "stream": true,
            // "model": model,
            // "max_tokens": maxtokens,
            // "stop": ["|<end>|", "|end|", "<|endoftext|>", "## human"],
        };

        AzureOAI.mergeParameters(body, parameters)

        if (/^o1(-.*)?$/.test(model)) {
           delete body.temperature // this parameter is not supported by o1 model
           body.reasoning_effort = reasoning_effort
        }

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
    var requestInit = {}
    // Enable option to trust self-signed certificate
    if (allowSelfSignedCert) {
        requestInit = {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
            signal: abortController.signal,
            agent: new Agent({
                rejectUnauthorized: false
            })
        }
    } else {
        requestInit = {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
            signal: abortController.signal
        }
    }
    new FetchStream({
        url: serverAddress + uri,
        requestInit: requestInit,
        timeout: timeout,
        onmessage: msgCallback,
        ondone: doneCallback,
        onerror: errorCallback
    });

}