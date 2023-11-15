import fetch, { RequestInit, Response } from "node-fetch";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import { window } from "vscode";
import ExtensionResource from "./ExtensionResource";

export interface FetchStreamOptions {
  url: string;
  requestInit: RequestInit;
  onmessage: (data: string) => void;
  ondone?: (data: Array<string>) => void;
  onerror?: (response: Response) => void;
}

export class FetchStream {
  url: string;
  requestInit: RequestInit;
  onmessage: FetchStreamOptions["onmessage"];
  ondone: FetchStreamOptions["ondone"];
  onerror: FetchStreamOptions["onerror"];

  constructor(options: FetchStreamOptions) {
    this.url = options.url;
    this.requestInit = options.requestInit;
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
    fetch(this.url, this.requestInit)
      .then(response => {
        if (response.status === 200) {
          return response.body!;
        } else {
          return Promise.reject(response);
        }
      }).then(async (readableStream) => {
        for await (const chunk of readableStream) {
          const chunkString = chunk.toString();
          parser.feed(chunkString);
          responseMessage.push(chunkString);
        }
      }).then(() => {
        this.ondone?.(responseMessage);
      }).catch(error => {
        console.error(error);
        window.showErrorMessage(`${error}`);
        window.setStatusBarMessage(`${error}`, 10000);
        xres.logMessage("caught error trying to fetch from " + this.url);
        xres.logMessage(error.message);
        this.onerror?.(error);
      });
  }
}
