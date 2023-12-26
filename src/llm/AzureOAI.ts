/* eslint-disable */
import { workspace } from "vscode";
import { AxiosInstance } from "axios";
import ExtensionResource from "../ExtensionResource";

interface OpenAiCompletionResponse {
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

export class AzureOAI {

    private constructor() {}

    //is the following function declaration correct? if not, how to fix it as a static, async function?
    static async completeCode(fileName: string, fimPrefixCode: string, fimSuffixCode: string, axiosInstance: AxiosInstance): Promise<string | undefined> {
        const serverAddress = workspace.getConfiguration("GAIChoy").get("ServerAddress") as string;
        const model = workspace.getConfiguration("GAIChoy").get("ChatModel") as string;
        const api_version = workspace.getConfiguration("GAIChoy").get("ApiVersion") as string;

        // get API key from secret storage
        let api_key = await ExtensionResource.instance.getApiKey();
        if (api_key === null || api_key === undefined || api_key === '') {
            throw new Error("Azure OpenAI API key is not set. Please configure API key in extension settings.");
        }

        const prompt = `${fimPrefixCode}${fimSuffixCode}`;
        let headers = {
            "Content-Type": "application/json",
            "api-key": api_key
        }

        let data = {
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": `Your role is an AI code interpreter.
Your task is to provide executable and functional code fragments AS-IS, based on the context provided by the user.
The context and metadata of the code fragment will be provided by user in the following format, as surrounded by triple backticks (actual input 
does not contain the triple backticks):
\`\`\`
{
    "file_name": "the file name of the program including file extension, which indicates the program type",
    "code_prefix": "pre-written code fragment before your output to-be-generated",
    "code_suffix": "pre-written code fragment after your output to-be-generated"
}
\`\`\`

You must reply the generated code in a JSON format, as surrounded by triple backticks (your response shall not include the triple backticks):
\`\`\`
{
    "generated_code": "the code to be generated"
}
\`\`\`

Your mission is to generate code fragments or snippets that completes the code based on given context.
Expectation of the output format:
- JSON format with "generated_code" field
- The code fragment or snippet as in the "generated_code" must fit in-between the "code_prefix" and "code_suffix" seamlessly.
- The "code_prefix" and "code_suffix" from user's input shall not be included in the "generated_code". Only the missing pieces 
  in-between are required.
- Don't respond in natural language with prose. Just program code.
- Don't wrap the "generated_code" inside markdown script such as fenced code block,
  Unless the file per se is a markdown file (typically with file extension .md),
- When literal text is needed, such as comments or inline documentation, express in user's natural language as inferred from the context

Example request in JSON format:

{
    "file_name": "fastapi.py",
    "code_prefix": "## This module setup API server with fastapi package and accepts request to /greet, which in turn
## responds the client with greetings.
from fastapi import FastAPI",
    "code_suffix": "@app.get(\"/greet\")
def greet():
return \"Hello, World!\""
}

Expected response in JSON format:

{
    "generated_code": "app = FastAPI()"
}
`
                },
                {
                    "role": "user",
                    "content": `
                    {
                            "file_name": ${JSON.stringify(fileName)},
                            "code_prefix": ${JSON.stringify(fimPrefixCode)},
                            "code_suffix": ${JSON.stringify(fimSuffixCode)}
                    }`
                }
            ]
        };
        ExtensionResource.instance.debugMessage("request.data: " + data)
        const uri = "/openai/deployments/" + model + "/chat/completions?api-version=" + api_version
        const response = await axiosInstance.post<OpenAiCompletionResponse>(serverAddress + uri, data, { headers: headers });
        ExtensionResource.instance.debugMessage("response.data: " + response.data)
        const content = response.data.choices[0].message.content;
        ExtensionResource.instance.debugMessage("response.data.choices[0].message.content: " + content)
        let contentJSON = JSON.parse(AzureOAI.trimTripleBackticks(content));
        return contentJSON.generated_code;
    }

    static trimTripleBackticks(str: string){
        if (str.startsWith('```') && str.endsWith('```')) {
            return str.slice(3, -3);
        }
        return str;
    }
}