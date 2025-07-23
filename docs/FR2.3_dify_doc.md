# API documentaion for Dify FR2.3

Chat applications support session persistence, allowing previous chat history to be used as context for responses. This can be applicable for chatbot, customer service AI, etc.

### Base URL

```
http://164579e467f4.ngrok-free.app/v1
```

### Authentication

The Service API uses `API-Key` authentication.
***Strongly recommend storing your API Key on the server-side, not shared or stored on the client-side, to avoid possible API-Key leakage that can lead to serious consequences.***

For all API requests, include your API Key in the `Authorization`HTTP Header, as shown below:

```javascript
 Authorization: Bearer {API_KEY}
```

-----

\<a id="Send-Chat-Message"\>\</a\>
**POST** `/chat-messages`

## [Send Chat Message](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#Send-Chat-Message)

Send a request to the chat application.

\<details\>
\<summary\>\<strong\>Details\</strong\>\</summary\>

### Request Body

  - `query`: `string`
      - User Input/Question content
  - `inputs`: `object`
      - Allows the entry of various variable values defined by the App. The `inputs` parameter contains multiple key/value pairs, with each key corresponding to a specific variable and each value being the specific value for that variable. If the variable is of file type, specify an object that has the keys described in `files` below. Default `{}`
  - `response_mode`: `string`
      - The mode of response return, supporting:
          - `streaming`: Streaming mode (recommended), implements a typewriter-like output through SSE ([Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)).
          - `blocking`: Blocking mode, returns result after execution is complete. (Requests may be interrupted if the process is long) Due to Cloudflare restrictions, the request will be interrupted without a return after 100 seconds.
  - `user`: `string`
      - User identifier, used to define the identity of the end-user for retrieval and statistics. Should be uniquely defined by the developer within the application. The Service API does not share conversations created by the WebApp.
  - `conversation_id`: `string`
      - Conversation ID, to continue the conversation based on previous chat records, it is necessary to pass the previous message's conversation\_id.
  - `files`: `array[object]`
      - File list, suitable for inputting files combined with text understanding and answering questions, available only when the model supports Vision capability.
          - `type` (string): Supported types:
              - `document`: ('TXT', 'MD', 'MARKDOWN', 'PDF', 'HTML', 'XLSX', 'XLS', 'DOCX', 'CSV', 'EML', 'MSG', 'PPTX', 'PPT', 'XML', 'EPUB')
              - `image`: ('JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG')
              - `audio`: ('MP3', 'M4A', 'WAV', 'WEBM', 'AMR')
              - `video`: ('MP4', 'MOV', 'MPEG', 'MPGA')
              - `custom`: (Other file types)
          - `transfer_method` (string): `remote_url` for image URL / `local_file` for file upload
          - `url` (string): Image URL (when the transfer method is `remote_url`)
          - `upload_file_id` (string): Uploaded file ID, obtained by uploading through the File Upload API (when `transfer_method` is `local_file`)
  - `auto_generate_name`: `bool`
      - Auto-generate title, default is `true`. If `false`, can achieve async title generation by calling the conversation rename API and setting `auto_generate` to `true`.

### Response

When `response_mode` is blocking, returns a `CompletionResponse` object. When `response_mode` is streaming, returns a `ChunkCompletionResponse` stream.

#### ChatCompletionResponse

Returns the complete App result, `Content-Type` is `application/json`.

  - `event` (string): Event type, fixed to `message`
  - `task_id` (string): Task ID, used for request tracking and the Stop Generate API
  - `id` (string): unique ID
  - `message_id` (string): Unique message ID
  - `conversation_id` (string): Conversation ID
  - `mode` (string): App mode, fixed as `chat`
  - `answer` (string): Complete response content
  - `metadata` (object):
      - `usage` (Usage): Model usage information
      - `retriever_resources` (array[RetrieverResource]): Citation and Attribution List
  - `created_at` (int): Message creation timestamp, e.g., 1705395332

#### ChunkChatCompletionResponse

Returns stream chunks, `Content-Type` is `text/event-stream`. Each chunk starts with `data:` and is separated by `\n\n`.

```streaming
data: {"event": "message", "task_id": "900bbd43-dc0b-4383-a372-aa6e6c414227", "id": "663c5084-a254-4040-8ad3-51f2a3c1a77c", "answer": "Hi", "created_at": 1705398420}
```

The structure varies by `event`:

  - **`message`**: LLM text chunk.
  - **`message_file`**: New file created by a tool.
  - **`message_end`**: End of streaming.
  - **`tts_message`**: TTS audio stream chunk (base64 encoded MP3).
  - **`tts_message_end`**: End of TTS audio stream.
  - **`message_replace`**: Content replacement for moderation.
  - **`workflow_started`**: Workflow execution started.
  - **`node_started`**: Node execution started.
  - **`node_finished`**: Node execution finished.
  - **`workflow_finished`**: Workflow execution finished.
  - **`error`**: An error occurred.
  - **`ping`**: Keep-alive event.

### Errors

  - `404`: Conversation does not exist
  - `400`: `invalid_param`, `app_unavailable`, `provider_not_initialize`, `provider_quota_exceeded`, `model_currently_not_support`, `completion_request_error`
  - `500`: Internal server error

\</details\>

\<details\>
\<summary\>\<strong\>Examples\</strong\>\</summary\>

### Request

**POST** `/chat-messages`

```shell
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/chat-messages' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputs": {},
    "query": "What are the specs of the iPhone 13 Pro Max?",
    "response_mode": "streaming",
    "conversation_id": "",
    "user": "abc-123",
    "files": [
      {
        "type": "image",
        "transfer_method": "remote_url",
        "url": "https://cloud.dify.ai/logo/logo-site.png"
      }
    ]
}'
```

### Blocking Mode Response

```json
{
    "event": "message",
    "task_id": "c3800678-a077-43df-a102-53f23ed20b88",
    "id": "9da23599-e713-473b-982c-4328d4f5c78a",
    "message_id": "9da23599-e713-473b-982c-4328d4f5c78a",
    "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2",
    "mode": "chat",
    "answer": "iPhone 13 Pro Max specs are listed here:...",
    "metadata": {
        "usage": {
            "prompt_tokens": 1033,
            "completion_tokens": 128,
            "total_tokens": 1161,
            "currency": "USD",
            "latency": 0.7682376249867957
        },
        "retriever_resources": [
            {
                "position": 1,
                "dataset_id": "101b4c97-fc2e-463c-90b1-5261a4cdcafb",
                "document_id": "8dd1ad74-0b5f-4175-b735-7d98bbbb4e00",
                "content": "\"Model\",\"Release Date\",\"Display Size\"..."
            }
        ]
    },
    "created_at": 1705407629
}
```

### Streaming Mode Response

```streaming
 data: {"event": "workflow_started", ...}
 data: {"event": "node_started", ...}
 data: {"event": "node_finished", ...}
 data: {"event": "workflow_finished", ...}
 data: {"event": "message", "answer": " I", ...}
 data: {"event": "message", "answer": "'m", ...}
 data: {"event": "message", "answer": " glad", ...}
 data: {"event": "message_end", ...}
 data: {"event": "tts_message", "audio": "qqqq...", ...}
 data: {"event": "tts_message_end", "audio": "", ...}
```

\</details\>

-----

\<a id="file-upload"\>\</a\>
**POST** `/files/upload`

## [File Upload](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#file-upload)

Upload a file for use with messages. Requires a `multipart/form-data` request.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Request Body

  - `file` (File): **Required**. The file to upload.
  - `user` (string): **Required**. Unique user identifier.

### Response

  - `id` (uuid): File ID
  - `name` (string): File name
  - `size` (int): File size in bytes
  - `extension` (string): File extension
  - `mime_type` (string): File MIME type
  - `created_by` (uuid): User ID
  - `created_at` (timestamp): Creation timestamp

### Errors

  - `400`: `no_file_uploaded`, `too_many_files`, `unsupported_preview`, `unsupported_estimate`
  - `413`: `file_too_large`
  - `415`: `unsupported_file_type`
  - `503`: `s3_connection_failed`, `s3_permission_denied`, `s3_file_too_large`
  - `500`: Internal server error

### Request Example

```shell
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/files/upload' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=image/[png|jpeg|jpg|webp|gif]' \
--form 'user=abc-123'
```

### Response Example

```json
{
  "id": "72fa9618-8f89-4a37-9b33-7e1178a24a67",
  "name": "example.png",
  "size": 1024,
  "extension": "png",
  "mime_type": "image/png",
  "created_by": "6ad1ab0a-73ff-4ac1-b9e4-cdb312f71f13",
  "created_at": 1577836800
}
```

\</details\>

-----

\<a id="stop-generatebacks"\>\</a\>
**POST** `/chat-messages/:task_id/stop`

## [Stop Generate](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#stop-generatebacks)

Stop message generation in streaming mode.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path

  - `task_id` (string): The task ID from the streaming response.

### Request Body

  - `user` (string): **Required**. The user identifier.

### Response

  - `result` (string): Always returns "success".

### Request Example

```shell
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/chat-messages/:task_id/stop' \
-H 'Authorization: Bearer {api_key}' \
-H 'Content-Type: application/json' \
--data-raw '{"user": "abc-123"}'
```

### Response Example

```json
{
  "result": "success"
}
```

\</details\>

-----

\<a id="feedbacks"\>\</a\>
**POST** `/messages/:message_id/feedbacks`

## [Message Feedback](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#feedbacks)

Provide feedback on a message.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path

  - `message_id` (string): The ID of the message to provide feedback on.

### Request Body

  - `rating` (string): `like`, `dislike`, or `null` to revoke.
  - `user` (string): **Required**. The user identifier.
  - `content` (string): Specific feedback content.

### Response

  - `result` (string): Always returns "success".

### Request Example

```shell
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/messages/:message_id/feedbacks' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "rating": "like",
    "user": "abc-123",
    "content": "message feedback information"
}'
```

### Response Example

```json
{
  "result": "success"
}
```

\</details\>

-----

\<a id="app-feedbacks"\>\</a\>
**GET** `/app/feedbacks`

## [Get feedbacks of application](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#app-feedbacks)

Get an application's feedbacks.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Query

  - `page` (string): (optional) Pagination, default: 1.
  - `limit` (string): (optional) Records per page, default: 20.

### Response

  - `data` (List): Returns a list of app feedbacks.

### Request Example

```shell
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/app/feedbacks?page=1&limit=20'
```

### Response Example

```json
{
    "data": [
        {
            "id": "8c0fbed8-e2f9-49ff-9f0e-15a35bdd0e25",
            "app_id": "f252d396-fe48-450e-94ec-e184218e7346",
            "conversation_id": "2397604b-9deb-430e-b285-4726e51fd62d",
            "message_id": "709c0b0f-0a96-4a4e-91a4-ec0889937b11",
            "rating": "like",
            "content": "message feedback information-3",
            "from_source": "user",
            "from_end_user_id": "74286412-9a1a-42c1-929c-01edb1d381d5",
            "from_account_id": null,
            "created_at": "2025-04-24T09:24:38",
            "updated_at": "2025-04-24T09:24:38"
        }
    ]
}
```

\</details\>

-----

\<a id="suggested"\>\</a\>
**GET** `/messages/{message_id}/suggested`

## [Next Suggested Questions](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#suggested)

Get next question suggestions for the current message.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path Params

  - `message_id` (string): The message ID.

### Query

  - `user` (string): The user identifier.

### Request Example

```shell
curl --location --request GET 'http://164579e467f4.ngrok-free.app/v1/messages/{message_id}/suggested?user=abc-123' \
--header 'Authorization: Bearer ENTER-YOUR-SECRET-KEY' \
--header 'Content-Type: application/json'
```

### Response Example

```json
{
  "result": "success",
  "data": [
      "a",
      "b",
      "c"
    ]
}
```

\</details\>

-----

\<a id="messages"\>\</a\>
**GET** `/messages`

## [Get Conversation History Messages](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#messages)

Returns historical chat records in reverse order.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Query

  - `conversation_id` (string): Conversation ID.
  - `user` (string): User identifier.
  - `first_id` (string): (optional) The ID of the first chat record on the current page.
  - `limit` (int): (optional) Number of messages to return (default is 20).

### Response

  - `data` (array[object]): List of messages.
  - `has_more` (bool): Whether there is a next page.
  - `limit` (int): Number of returned items.

### Request Example

```shell
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/messages?user=abc-123&conversation_id=' \
--header 'Authorization: Bearer {api_key}'
```

### Response Example

```json
{
  "limit": 20,
  "has_more": false,
  "data": [
    {
        "id": "a076a87f-31e5-48dc-b452-0061adbbc922",
        "conversation_id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
        "inputs": {"name": "dify"},
        "query": "iphone 13 pro",
        "answer": "The iPhone 13 Pro, released on September 24, 2021...",
        "created_at": 1705569239
    }
  ]
}
```

\</details\>

-----

\<a id="conversations"\>\</a\>
**GET** `/conversations`

## [Get Conversations](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#conversations)

Retrieve the conversation list for the current user.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Query

  - `user` (string): User identifier.
  - `last_id` (string): (optional) ID of the last record for pagination.
  - `limit` (int): (optional) Number of records to return (default 20, max 100).
  - `sort_by` (string): (optional) Sorting field. Default: `-updated_at`. Values: `created_at`, `-created_at`, `updated_at`, `-updated_at`.

### Response

  - `data` (array[object]): List of conversations.
  - `has_more` (bool): Indicates if more pages are available.
  - `limit` (int): Number of entries returned.

### Request Example

```shell
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/conversations?user=abc-123&last_id=&limit=20' \
--header 'Authorization: Bearer {api_key}'
```

### Response Example

```json
{
  "limit": 20,
  "has_more": false,
  "data": [
    {
      "id": "10799fb8-64f7-4296-bbf7-b42bfbe0ae54",
      "name": "New chat",
      "inputs": {
        "book": "book",
        "myName": "Lucy"
      },
      "status": "normal",
      "created_at": 1679667915,
      "updated_at": 1679667915
    }
  ]
}
```

\</details\>

-----

\<a id="delete"\>\</a\>
**DELETE** `/conversations/:conversation_id`

## [Delete Conversation](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#delete)

Delete a conversation.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path

  - `conversation_id` (string): Conversation ID.

### Request Body

  - `user` (string): The user identifier.

### Response

  - `204 No Content`

### Request Example

```shell
curl -X DELETE 'http://164579e467f4.ngrok-free.app/v1/conversations/:conversation_id' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
 "user": "abc-123"
}'
```

\</details\>

-----

\<a id="rename"\>\</a\>
**POST** `/conversations/:conversation_id/name`

## [Conversation Rename](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#rename)

Rename a conversation.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path

  - `conversation_id` (string): Conversation ID.

### Request Body

  - `name` (string): (optional) The new name.
  - `auto_generate` (bool): (optional) Automatically generate a title (default `false`).
  - `user` (string): The user identifier.

### Response

  - `id` (string): Conversation ID.
  - `name` (string): Conversation name.
  - `status` (string): Conversation status.
  - `created_at` (timestamp): Creation timestamp.
  - `updated_at` (timestamp): Update timestamp.

### Request Example

```shell
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/conversations/:conversation_id/name' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
 "name": "",
 "auto_generate": true,
 "user": "abc-123"
}'
```

### Response Example

```json
{
    "id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
    "name": "Chat vs AI",
    "status": "normal",
    "created_at": 1705569238,
    "updated_at": 1705569238
}
```

\</details\>

-----

\<a id="conversation-variables"\>\</a\>
**GET** `/conversations/:conversation_id/variables`

## [Get Conversation Variables](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#conversation-variables)

Retrieve variables from a specific conversation.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path Parameters

  - `conversation_id` (string): The ID of the conversation.

### Query Parameters

  - `user` (string): The user identifier.
  - `last_id` (string): (optional) The ID of the last record for pagination.
  - `limit` (int): (optional) Number of records (default 20, max 100).

### Response

  - `data` (array[object]): List of variables.

### Errors

  - `404`: `conversation_not_exists`.

### Request Example

```shell
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/conversations/{conversation_id}/variables?user=abc-123' \
--header 'Authorization: Bearer {api_key}'
```

### Response Example

```json
{
  "limit": 100,
  "has_more": false,
  "data": [
    {
      "id": "variable-uuid-1",
      "name": "customer_name",
      "value_type": "string",
      "value": "John Doe",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    }
  ]
}
```

\</details\>

-----

\<a id="audio"\>\</a\>
**POST** `/audio-to-text`

## [Speech to Text](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#audio)

This endpoint requires a multipart/form-data request.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Request Body

  - `file` (file): Audio file. Supported formats: `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm`. Max size: 15MB.
  - `user` (string): User identifier.

### Response

  - `text` (string): Output text.

### Request Example

```shell
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/audio-to-text' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=audio/[mp3|mp4|mpeg|mpga|m4a|wav|webm]'
```

### Response Example

```json
{
  "text": ""
}
```

\</details\>

-----

\<a id="text-to-audio"\>\</a\>
**POST** `/text-to-audio`

## [Text to Audio](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#audio)

Text to speech.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Request Body

  - `message_id` (str): (optional) The message ID to synthesize. Priority over `text`.
  - `text` (str): (optional) Text to synthesize.
  - `user` (string): The user identifier.

### Request Example

```shell
curl -o text-to-audio.mp3 -X POST 'http://164579e467f4.ngrok-free.app/v1/text-to-audio' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290",
    "text": "Hello Dify",
    "user": "abc-123"
}'
```

### Response Headers

```json
{
  "Content-Type": "audio/wav"
}
```

\</details\>

-----

\<a id="info"\>\</a\>
**GET** `/info`

## [Get Application Basic Information](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#info)

Get basic information about this application.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Response

  - `name` (string): application name
  - `description` (string): application description
  - `mode` (string): application mode
  - `author_name` (string): application author name

### Request Example

```shell
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/info' \
-H 'Authorization: Bearer {api_key}'
```

### Response Example

```json
{
  "name": "My App",
  "description": "This is my app.",
  "mode": "advanced-chat",
  "author_name": "Dify"
}
```

\</details\>

-----

\<a id="parameters"\>\</a\>
**GET** `/parameters`

## [Get Application Parameters Information](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#parameters)

Get features, input parameter names, types, and default values.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Response

  - `opening_statement` (string)
  - `suggested_questions` (array[string])
  - `speech_to_text` (object): `enabled` (bool)
  - `text_to_speech` (object): `enabled` (bool), `voice` (string), etc.
  - `user_input_form` (array[object]): Configurations for text, paragraph, select inputs.
  - `file_upload` (object): Image upload settings.
  - `system_parameters` (object): File size limits.

### Request Example

```shell
 curl -X GET 'http://164579e467f4.ngrok-free.app/v1/parameters'
```

### Response Example

```json
{
  "opening_statement": "Hello!",
  "speech_to_text": {
      "enabled": true
  },
  "text_to_speech": {
      "enabled": true,
      "voice": "sambert-zhinan-v1",
      "language": "zh-Hans",
      "autoPlay": "disabled"
  },
  "user_input_form": [
      {
          "paragraph": {
              "label": "Query",
              "variable": "query",
              "required": true,
              "default": ""
          }
      }
  ],
  "system_parameters": {
      "file_size_limit": 15,
      "image_file_size_limit": 10
  }
}
```

\</details\>

-----

\<a id="meta"\>\</a\>
**GET** `/meta`

## [Get Application Meta Information](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#meta)

Get icons of tools in this application.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Response

  - `tool_icons` (object[string]): A map of tool names to their icons (URL or emoji object).

### Request Example

```shell
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/meta' \
-H 'Authorization: Bearer {api_key}'
```

### Response Example

```json
{
  "tool_icons": {
    "dalle2": "https://cloud.dify.ai/console/api/workspaces/current/tool-provider/builtin/dalle/icon",
    "api_tool": {
      "background": "#252525",
      "content": "😁"
    }
  }
}
```

\</details\>

-----

\<a id="site"\>\</a\>
**GET** `/site`

## [Get Application WebApp Settings](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#site)

Get the WebApp settings of the application.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Response

  - `title` (string): WebApp name
  - `chat_color_theme` (string): Color in hex format
  - ...and other settings.

### Request Example

```shell
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/site' \
-H 'Authorization: Bearer {api_key}'
```

### Response Example

```json
{
  "title": "My App",
  "chat_color_theme": "#ff4a4a",
  "icon_type": "emoji",
  "icon": "😄",
  "icon_background": "#FFEAD5",
  "description": "This is my app.",
  "copyright": "all rights reserved",
  "default_language": "en-US"
}
```

\</details\>

-----

\<a id="annotation\_list"\>\</a\>
**GET** `/apps/annotations`

## [Get Annotation List](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#annotation_list)

Get a list of annotations for the app.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Query

  - `page` (string): Page number.
  - `limit` (string): Number of items (default 20, max 100).

### Request Example

```shell
curl --location --request GET '/apps/annotations?page=1&limit=20' \
--header 'Authorization: Bearer {api_key}'
```

### Response Example

```json
{
  "data": [
    {
      "id": "69d48372-ad81-4c75-9c46-2ce197b4d402",
      "question": "What is your name?",
      "answer": "I am Dify.",
      "created_at": 1735625869
    }
  ],
  "has_more": false,
  "limit": 20,
  "total": 1,
  "page": 1
}
```

\</details\>

-----

\<a id="create\_annotation"\>\</a\>
**POST** `/apps/annotations`

## [Create Annotation](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#create_annotation)

Create a new annotation.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Request Body

  - `question` (string): The question for the annotation.
  - `answer` (string): The answer for the annotation.

### Request Example

```shell
curl --location --request POST '/apps/annotations' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{"question": "What is your name?","answer": "I am Dify."}'
```

### Response Example

```json
{
  "id": "69d48372-ad81-4c75-9c46-2ce197b4d402",
  "question": "What is your name?",
  "answer": "I am Dify.",
  "created_at": 1735625869
}
```

\</details\>

-----

\<a id="update\_annotation"\>\</a\>
**PUT** `/apps/annotations/{annotation_id}`

## [Update Annotation](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#update_annotation)

Update an existing annotation.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path

  - `annotation_id` (string): The ID of the annotation to update.

### Request Body

  - `question` (string): The updated question.
  - `answer` (string): The updated answer.

### Request Example

```shell
curl --location --request PUT '/apps/annotations/{annotation_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{"question": "What is your name?","answer": "I am Dify."}'
```

\</details\>

-----

\<a id="delete\_annotation"\>\</a\>
**DELETE** `/apps/annotations/{annotation_id}`

## [Delete Annotation](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#delete_annotation)

Delete an annotation.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path

  - `annotation_id` (string): The ID of the annotation to delete.

### Request Example

```shell
curl --location --request DELETE '/apps/annotations/{annotation_id}' \
--header 'Authorization: Bearer {api_key}'
```

### Response

  - `204 No Content`

\</details\>

-----

\<a id="initial\_annotation\_reply\_settings"\>\</a\>
**POST** `/apps/annotation-reply/{action}`

## [Initial Annotation Reply Settings](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#initial_annotation_reply_settings)

Enable or disable annotation reply settings.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path

  - `action` (string): `enable` or `disable`.

### Request Body

  - `embedding_provider_name` (string): (optional) Specified embedding model provider.
  - `embedding_model_name` (string): (optional) Specified embedding model.
  - `score_threshold` (number): Similarity threshold for matching replies.

### Request Example

```shell
curl --location --request POST '/apps/annotation-reply/{action}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{"score_threshold": 0.9, "embedding_provider_name": "zhipu", "embedding_model_name": "embedding_3"}'
```

### Response Example

```json
{
  "job_id": "b15c8f68-1cf4-4877-bf21-ed7cf2011802",
  "job_status": "waiting"
}
```

\</details\>

-----

\<a id="initial\_annotation\_reply\_settings\_task\_status"\>\</a\>
**GET** `/apps/annotation-reply/{action}/status/{job_id}`

## [Query Initial Annotation Reply Settings Task Status](https://164579e467f4.ngrok-free.app/app/1e6e871b-2d6c-4760-b2fc-6d4ede816e7b/develop#initial_annotation_reply_settings_task_status)

Query the status of the annotation reply settings task.

\<details\>
\<summary\>\<strong\>Details & Examples\</strong\>\</summary\>

### Path

  - `action` (string): `enable` or `disable`.
  - `job_id` (string): The job ID from the previous request.

### Request Example

```shell
curl --location --request GET '/apps/annotation-reply/{action}/status/{job_id}' \
--header 'Authorization: Bearer {api_key}'
```

### Response Example

```json
{
  "job_id": "b15c8f68-1cf4-4877-bf21-ed7cf2011802",
  "job_status": "waiting",
  "error_msg": ""
}
```

\</details\>