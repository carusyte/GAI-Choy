# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.7] - 2023-12-14

- Replace showdown with markdown-it for better markdown-to-html conversion result with escaping
- Fixed nested list indentation display issue

## [0.1.6] - 2023-12-01

- Nicer formatting and layout in chat panel
- Fixed: code blocks in the chat answer has low contrast (powershell, javascript, etc.)

## [0.1.5] - 2023-11-30

- Fixed unexpected HTML escaping in fenced code blocks
- Fixed unexpected double quotes embracing generated code (hopefully)

## [0.1.4] - 2023-11-27

- Enable "Clear Chat History" in extension setting
- Escape HTML keywords in user's input which might cause issue in webview display

## [0.1.3] - 2023-11-22

- Add setting to enable debug message to output channel at runtime
- Fixed indentation issue for code completion

## [0.1.2] - 2023-11-16

- Enlarge code completion context to entire program file
- Refined code completion meta-prompt to avoid answer in single-line of code

## [0.1.1] - 2023-11-15

- update README.md
- fixed duplicated outputchannel issue
- prefixed output message with timestamp

## [0.1.0] - 2023-11-13

First beta release.
