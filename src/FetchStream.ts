import fetch, { RequestInit, Response } from "node-fetch";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import { window } from "vscode";
import ExtensionResource from "./ExtensionResource";

export interface FetchStreamOptions {
  url: string;
  requestInit: RequestInit;
  timeout: number;
  onmessage: (data: string) => void;
  ondone?: (data: Array<string>) => void;
  onerror?: (response: Response) => void;
}

export class FetchStream {
  url: string;
  requestInit: RequestInit;
  timeout: number;
  onmessage: FetchStreamOptions["onmessage"];
  ondone: FetchStreamOptions["ondone"];
  onerror: FetchStreamOptions["onerror"];

  constructor(options: FetchStreamOptions) {
    this.url = options.url;
    this.requestInit = options.requestInit;
    this.timeout = options.timeout;
    this.onmessage = options.onmessage;
    this.ondone = options.ondone;
    this.onerror = options.onerror;
    this.createFetchRequest();
  }

  createFetchRequest() {
    const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
      if (event.type === "event") {
        this.onmessage(event.data);
      }
    });
    const xres = ExtensionResource.instance;
    var responseMessage:Array<string> = [];
    // retry the following fetch action until success or this.timeout (seconds) is exceeded. 
    // each attempt to fetch should not exceed the remaining wait time, which equals this.timeout - total elapsed time.
    const startTime = Date.now();
    let elapsedTime = 0;
    
    const fetchWithTimeout = () => {
      const remainingTime = this.timeout * 1000 - elapsedTime;
      if (remainingTime <= 0) {
        this.onerror?.(new Response(null, { status: 408, statusText: 'FetchStream timeout exceeded.' }));
        return;
      }
    
      const abortController = new AbortController();
      const id = setTimeout(() => abortController.abort(), remainingTime);
      this.requestInit.signal = abortController.signal;
    
      fetch(this.url, this.requestInit)
        .then(response => {
          clearTimeout(id);
          if (response.status === 200) {
            return response.body!;
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
            // return Promise.reject(response);
          }
        }).then(async (readableStream) => {
          // read strings from readableStream chunk by chunk and feed into parser, push into responseMessage
          for await (const chunk of readableStream) {
            const chunkString = chunk.toString();
            parser.feed(chunkString);
            responseMessage.push(chunkString);
          }
        }).then(() => {
          this.ondone?.(responseMessage);
        }).catch(error => {
          elapsedTime = Date.now() - startTime;
          if (elapsedTime < this.timeout * 1000) {
            xres.errorMessage("retrying error calling " + this.url);
            xres.errorMessage(error.message);
            fetchWithTimeout();
          } else {
            window.showErrorMessage(`${error}`);
            window.setStatusBarMessage(`${error}`, 10000);
            xres.errorMessage("caught error trying to fetch from " + this.url);
            xres.errorMessage(error.message);
            this.onerror?.(error);
          }
        });
    };
    
    fetchWithTimeout();
  }
}
