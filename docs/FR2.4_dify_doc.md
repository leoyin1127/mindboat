# API documentaion for Dify FR2.4

Chat applications support session persistence, allowing previous chat history to be used as context for responses. This can be applicable for chatbot, customer service AI, etc.

## Base URL

```
http://164579e467f4.ngrok-free.app/v1
```

## Authentication

The Service API uses `API-Key` authentication.

**Strongly recommend storing your API Key on the server-side, not shared or stored on the client-side, to avoid possible API-Key leakage that can lead to serious consequences.**

For all API requests, include your API Key in the `Authorization` HTTP Header, as shown below:

```javascript
Authorization: Bearer {API_KEY}
```

---

### **输入变量 (`inputs`) 详情**

| 变量名 | 类型 | 变量说明 | 备注 |
| --- | --- | --- | --- |
| `heartbeat_record` | 段落 | 用于输入心跳记录的长文本。 | 串成一大段一起发（所有分心+回溯一次不分心的记录）
对应dify里面heartbeat_log |
| `user_goal` | 文本 | 用户的目标。 | 对应dify里面的memory |
| `UUID` | 文本 | 用户的唯一标识符，最大长度为 256。（） | 这个dify里面不用接入，是防止你的id乱掉的 |
| query | 段落 | 用户的问题 | ，初始默认发“1”启动对话 |

## Send Chat Message

`POST` `/chat-messages`

Send a request to the chat application.

### Request Body

- `query` (string) - User Input/Question content
- `inputs` (object) - Allows the entry of various variable values defined by the App. The `inputs` parameter contains multiple key/value pairs, with each key corresponding to a specific variable and each value being the specific value for that variable. If the variable is of file type, specify an object that has the keys described in `files` below. Default `{}`
- `response_mode` (string) - The mode of response return, supporting:
  - `streaming` - Streaming mode (recommended), implements a typewriter-like output through SSE ([Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events))
  - `blocking` - Blocking mode, returns result after execution is complete. (Requests may be interrupted if the process is long) Due to Cloudflare restrictions, the request will be interrupted without a return after 100 seconds.
- `user` (string) - User identifier, used to define the identity of the end-user for retrieval and statistics. Should be uniquely defined by the developer within the application. The Service API does not share conversations created by the WebApp.
- `conversation_id` (string) - Conversation ID, to continue the conversation based on previous chat records, it is necessary to pass the previous message's conversation_id.
- `files` (array[object]) - File list, suitable for inputting files combined with text understanding and answering questions, available only when the model supports Vision capability.
  - `type` (string) Supported type:
    - `document` ('TXT', 'MD', 'MARKDOWN', 'PDF', 'HTML', 'XLSX', 'XLS', 'DOCX', 'CSV', 'EML', 'MSG', 'PPTX', 'PPT', 'XML', 'EPUB')
    - `image` ('JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG')
    - `audio` ('MP3', 'M4A', 'WAV', 'WEBM', 'AMR')
    - `video` ('MP4', 'MOV', 'MPEG', 'MPGA')
    - `custom` (Other file types)
  - `transfer_method` (string) Transfer method, `remote_url` for image URL / `local_file` for file upload
  - `url` (string) Image URL (when the transfer method is `remote_url`)
  - `upload_file_id` (string) Uploaded file ID, which must be obtained by uploading through the File Upload API in advance (when the transfer method is `local_file`)
- `auto_generate_name` (bool) - Auto-generate title, default is `true`. If set to `false`, can achieve async title generation by calling the conversation rename API and setting `auto_generate` to `true`.

### Response

When response_mode is blocking, return a CompletionResponse object.
When response_mode is streaming, return a ChunkCompletionResponse stream.

### ChatCompletionResponse

Returns the complete App result, `Content-Type` is `application/json`.

- `event` (string) Event type, fixed to `message`
- `task_id` (string) Task ID, used for request tracking and the below Stop Generate API
- `id` (string) unique ID
- `message_id` (string) Unique message ID
- `conversation_id` (string) Conversation ID
- `mode` (string) App mode, fixed as `chat`
- `answer` (string) Complete response content
- `metadata` (object) Metadata
  - `usage` (Usage) Model usage information
  - `retriever_resources` (array[RetrieverResource]) Citation and Attribution List
- `created_at` (int) Message creation timestamp, e.g., 1705395332

### ChunkChatCompletionResponse

Returns the stream chunks outputted by the App, `Content-Type` is `text/event-stream`.
Each streaming chunk starts with `data:`, separated by two newline characters `\n\n`, as shown below:

```streaming
data: {"event": "message", "task_id": "900bbd43-dc0b-4383-a372-aa6e6c414227", "id": "663c5084-a254-4040-8ad3-51f2a3c1a77c", "answer": "Hi", "created_at": 1705398420}\n\n
```

The structure of the streaming chunks varies depending on the `event`:

- `event: message` LLM returns text chunk event
  - `task_id` (string) Task ID
  - `message_id` (string) Unique message ID
  - `conversation_id` (string) Conversation ID
  - `answer` (string) LLM returned text chunk content
  - `created_at` (int) Creation timestamp

- `event: message_file` Message file event
  - `id` (string) File unique ID
  - `type` (string) File type, only allow "image" currently
  - `belongs_to` (string) Belongs to, it will only be an 'assistant' here
  - `url` (string) Remote url of file
  - `conversation_id` (string) Conversation ID

- `event: message_end` Message end event
  - `task_id` (string) Task ID
  - `message_id` (string) Unique message ID
  - `conversation_id` (string) Conversation ID
  - `metadata` (object) Metadata
    - `usage` (Usage) Model usage information
    - `retriever_resources` (array[RetrieverResource]) Citation and Attribution List

- `event: tts_message` TTS audio stream event
  - `task_id` (string) Task ID
  - `message_id` (string) Unique message ID
  - `audio` (string) Audio in base64 format
  - `created_at` (int) Creation timestamp

- `event: tts_message_end` TTS audio stream end event
  - `task_id` (string) Task ID
  - `message_id` (string) Unique message ID
  - `audio` (string) Empty string
  - `created_at` (int) Creation timestamp

- `event: message_replace` Message content replacement event
  - `task_id` (string) Task ID
  - `message_id` (string) Unique message ID
  - `conversation_id` (string) Conversation ID
  - `answer` (string) Replacement content
  - `created_at` (int) Creation timestamp

- `event: workflow_started` workflow starts execution
  - `task_id` (string) Task ID
  - `workflow_run_id` (string) Unique ID of workflow execution
  - `event` (string) fixed to `workflow_started`
  - `data` (object) detail

- `event: node_started` node execution started
  - `task_id` (string) Task ID
  - `workflow_run_id` (string) Unique ID of workflow execution
  - `event` (string) fixed to `node_started`
  - `data` (object) detail

- `event: node_finished` node execution ends
  - `task_id` (string) Task ID
  - `workflow_run_id` (string) Unique ID of workflow execution
  - `event` (string) fixed to `node_finished`
  - `data` (object) detail

- `event: workflow_finished` workflow execution ends
  - `task_id` (string) Task ID
  - `workflow_run_id` (string) Unique ID of workflow execution
  - `event` (string) fixed to `workflow_finished`
  - `data` (object) detail

- `event: error` Exceptions during streaming
  - `task_id` (string) Task ID
  - `message_id` (string) Unique message ID
  - `status` (int) HTTP status code
  - `code` (string) Error code
  - `message` (string) Error message

- `event: ping` Ping event every 10 seconds to keep the connection alive

### Errors

- 404, Conversation does not exists
- 400, `invalid_param`, abnormal parameter input
- 400, `app_unavailable`, App configuration unavailable
- 400, `provider_not_initialize`, no available model credential configuration
- 400, `provider_quota_exceeded`, model invocation quota insufficient
- 400, `model_currently_not_support`, current model unavailable
- 400, `completion_request_error`, text generation failed
- 500, internal server error

#### Request Example

```bash
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

#### Blocking Mode Response Example

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
            "prompt_unit_price": "0.001",
            "prompt_price_unit": "0.001",
            "prompt_price": "0.0010330",
            "completion_tokens": 128,
            "completion_unit_price": "0.002",
            "completion_price_unit": "0.001",
            "completion_price": "0.0002560",
            "total_tokens": 1161,
            "total_price": "0.0012890",
            "currency": "USD",
            "latency": 0.7682376249867957
        },
        "retriever_resources": [
            {
                "position": 1,
                "dataset_id": "101b4c97-fc2e-463c-90b1-5261a4cdcafb",
                "dataset_name": "iPhone",
                "document_id": "8dd1ad74-0b5f-4175-b735-7d98bbbb4e00",
                "document_name": "iPhone List",
                "segment_id": "ed599c7f-2766-4294-9d1d-e5235a61270a",
                "score": 0.98457545,
                "content": "Model,Release Date,Display Size..."
            }
        ]
    },
    "created_at": 1705407629
}
```

#### Streaming Mode Response Example

```streaming
data: {"event": "workflow_started", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "workflow_id": "dfjasklfjdslag", "sequence_number": 1, "created_at": 1679586595}}
data: {"event": "node_started", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "node_id": "dfjasklfjdslag", "node_type": "start", "title": "Start", "index": 0, "predecessor_node_id": "fdljewklfklgejlglsd", "inputs": {}, "created_at": 1679586595}}
data: {"event": "node_finished", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "node_id": "dfjasklfjdslag", "node_type": "start", "title": "Start", "index": 0, "predecessor_node_id": "fdljewklfklgejlglsd", "inputs": {}, "outputs": {}, "status": "succeeded", "elapsed_time": 0.324, "execution_metadata": {"total_tokens": 63127864, "total_price": 2.378, "currency": "USD"}, "created_at": 1679586595}}
data: {"event": "workflow_finished", "task_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "workflow_run_id": "5ad498-f0c7-4085-b384-88cbe6290", "data": {"id": "5ad498-f0c7-4085-b384-88cbe6290", "workflow_id": "dfjasklfjdslag", "outputs": {}, "status": "succeeded", "elapsed_time": 0.324, "total_tokens": 63127864, "total_steps": "1", "created_at": 1679586595, "finished_at": 1679976595}}
data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " I", "created_at": 1679586595}
data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": "'m", "created_at": 1679586595}
data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " glad", "created_at": 1679586595}
data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " to", "created_at": 1679586595}
data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " meet", "created_at": 1679586595}
data: {"event": "message", "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "answer": " you", "created_at": 1679586595}
data: {"event": "message_end", "id": "5e52ce04-874b-4d27-9045-b3bc80def685", "conversation_id": "45701982-8118-4bc5-8e9b-64562b4555f2", "metadata": {"usage": {"prompt_tokens": 1033, "prompt_unit_price": "0.001", "prompt_price_unit": "0.001", "prompt_price": "0.0010330", "completion_tokens": 135, "completion_unit_price": "0.002", "completion_price_unit": "0.001", "completion_price": "0.0002700", "total_tokens": 1168, "total_price": "0.0013030", "currency": "USD", "latency": 1.381760165997548}, "retriever_resources": [{"position": 1, "dataset_id": "101b4c97-fc2e-463c-90b1-5261a4cdcafb", "dataset_name": "iPhone", "document_id": "8dd1ad74-0b5f-4175-b735-7d98bbbb4e00", "document_name": "iPhone List", "segment_id": "ed599c7f-2766-4294-9d1d-e5235a61270a", "score": 0.98457545, "content": "..."}]}}
data: {"event": "tts_message", "conversation_id": "23dd85f3-1a41-4ea0-b7a9-062734ccfaf9", "message_id": "a8bdc41c-13b2-4c18-bfd9-054b9803038c", "created_at": 1721205487, "task_id": "3bf8a0bb-e73b-4690-9e66-4e429bad8ee7", "audio": "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"}
data: {"event": "tts_message_end", "conversation_id": "23dd85f3-1a41-4ea0-b7a9-062734ccfaf9", "message_id": "a8bdc41c-13b2-4c18-bfd9-054b9803038c", "created_at": 1721205487, "task_id": "3bf8a0bb-e73b-4690-9e66-4e429bad8ee7", "audio": ""}
```

---

## File Upload

`POST` `/files/upload`

Upload a file for use when sending messages, enabling multimodal understanding of images and text.
Supports any formats that are supported by your application.
Uploaded files are for use by the current end-user only.

### Request Body

This interface requires a `multipart/form-data` request.

- `file` (File) Required - The file to be uploaded.
- `user` (string) Required - User identifier, defined by the developer's rules, must be unique within the application. The Service API does not share conversations created by the WebApp.

### Response

After a successful upload, the server will return the file's ID and related information.

- `id` (uuid) ID
- `name` (string) File name
- `size` (int) File size (bytes)
- `extension` (string) File extension
- `mime_type` (string) File mime-type
- `created_by` (uuid) End-user ID
- `created_at` (timestamp) Creation timestamp, e.g., 1705395332

### Errors

- 400, `no_file_uploaded`, a file must be provided
- 400, `too_many_files`, currently only one file is accepted
- 400, `unsupported_preview`, the file does not support preview
- 400, `unsupported_estimate`, the file does not support estimation
- 413, `file_too_large`, the file is too large
- 415, `unsupported_file_type`, unsupported extension, currently only document files are accepted
- 503, `s3_connection_failed`, unable to connect to S3 service
- 503, `s3_permission_denied`, no permission to upload files to S3
- 503, `s3_file_too_large`, file exceeds S3 size limit
- 500, internal server error

#### Request Example

```bash
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/files/upload' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=image/[png|jpeg|jpg|webp|gif]' \
--form 'user=abc-123'
```

#### Response Example

```json
{
  "id": "72fa9618-8f89-4a37-9b33-7e1178a24a67",
  "name": "example.png",
  "size": 1024,
  "extension": "png",
  "mime_type": "image/png",
  "created_by": "6ad1ab0a-73ff-4ac1-b9e4-cdb312f71f13",
  "created_at": 1577836800,
}
```

---

## Stop Generate

`POST` `/chat-messages/:task_id/stop`

Only supported in streaming mode.

### Path

- `task_id` (string) Task ID, can be obtained from the streaming chunk return

### Request Body

- `user` (string) Required - User identifier, used to define the identity of the end-user, must be consistent with the user passed in the message sending interface. The Service API does not share conversations created by the WebApp.

### Response

- `result` (string) Always returns "success"

#### Request Example

```bash
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/chat-messages/:task_id/stop' \
-H 'Authorization: Bearer {api_key}' \
-H 'Content-Type: application/json' \
--data-raw '{"user": "abc-123"}'
```

#### Response Example

```json
{
  "result": "success"
}
```

---

## Message Feedback

`POST` `/messages/:message_id/feedbacks`

End-users can provide feedback messages, facilitating application developers to optimize expected outputs.

### Path

- `message_id` (string) - Message ID

### Request Body

- `rating` (string) - Upvote as `like`, downvote as `dislike`, revoke upvote as `null`
- `user` (string) - User identifier, defined by the developer's rules, must be unique within the application. The Service API does not share conversations created by the WebApp.
- `content` (string) - The specific content of message feedback.

### Response

- `result` (string) Always returns "success"

#### Request Example

```bash
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/messages/:message_id/feedbacks' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "rating": "like",
    "user": "abc-123",
    "content": "message feedback information"
}'
```

#### Response Example

```json
{
  "result": "success"
}
```

---

## Get feedbacks of application

`GET` `/app/feedbacks`

Get application's feedbacks.

### Query

- `page` (string) - (optional) pagination, default: 1
- `limit` (string) - (optional) records per page default: 20

### Response

- `data` (List) return apps feedback list.

#### Request Example

```bash
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/app/feedbacks?page=1&limit=20'
```

#### Response Example

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

---

## Next Suggested Questions

`GET` `/messages/{message_id}/suggested`

Get next questions suggestions for the current message

### Path Params

- `message_id` (string) - Message ID

### Query

- `user` (string) - User identifier, used to define the identity of the end-user for retrieval and statistics. Should be uniquely defined by the developer within the application.

#### Request Example

```bash
curl --location --request GET 'http://164579e467f4.ngrok-free.app/v1/messages/{message_id}/suggested?user=abc-123' \
--header 'Authorization: Bearer ENTER-YOUR-SECRET-KEY' \
--header 'Content-Type: application/json'
```

#### Response Example

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

---

## Get Conversation History Messages

`GET` `/messages`

Returns historical chat records in a scrolling load format, with the first page returning the latest `{limit}` messages, i.e., in reverse order.

### Query

- `conversation_id` (string) - Conversation ID
- `user` (string) - User identifier, used to define the identity of the end-user for retrieval and statistics. Should be uniquely defined by the developer within the application.
- `first_id` (string) - The ID of the first chat record on the current page, default is null.
- `limit` (int) - How many chat history messages to return in one request, default is 20.

### Response

- `data` (array[object]) Message list
  - `id` (string) Message ID
  - `conversation_id` (string) Conversation ID
  - `inputs` (object) User input parameters.
  - `query` (string) User input / question content.
  - `message_files` (array[object]) Message files
    - `id` (string) ID
    - `type` (string) File type, image for images
    - `url` (string) Preview image URL
    - `belongs_to` (string) belongs to, user or assistant
  - `answer` (string) Response message content
  - `created_at` (timestamp) Creation timestamp, e.g., 1705395332
  - `feedback` (object) Feedback information
    - `rating` (string) Upvote as `like` / Downvote as `dislike`
  - `retriever_resources` (array[RetrieverResource]) Citation and Attribution List
- `has_more` (bool) Whether there is a next page
- `limit` (int) Number of returned items, if input exceeds system limit, returns system limit amount

#### Request Example

```bash
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/messages?user=abc-123&conversation_id=' \
--header 'Authorization: Bearer {api_key}'
```

#### Response Example

```json
{
  "limit": 20,
  "has_more": false,
  "data": [
    {
        "id": "a076a87f-31e5-48dc-b452-0061adbbc922",
        "conversation_id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
        "inputs": {
            "name": "dify"
        },
        "query": "iphone 13 pro",
        "answer": "The iPhone 13 Pro, released on September 24, 2021, features a 6.1-inch display with a resolution of 1170 x 2532. It is equipped with a Hexa-core (2x3.23 GHz Avalanche + 4x1.82 GHz Blizzard) processor, 6 GB of RAM, and offers storage options of 128 GB, 256 GB, 512 GB, and 1 TB. The camera is 12 MP, the battery capacity is 3095 mAh, and it runs on iOS 15.",
        "message_files": [],
        "feedback": null,
        "retriever_resources": [
            {
                "position": 1,
                "dataset_id": "101b4c97-fc2e-463c-90b1-5261a4cdcafb",
                "dataset_name": "iPhone",
                "document_id": "8dd1ad74-0b5f-4175-b735-7d98bbbb4e00",
                "document_name": "iPhone List",
                "segment_id": "ed599c7f-2766-4294-9d1d-e5235a61270a",
                "score": 0.98457545,
                "content": "Model,Release Date,Display Size..."
            }
        ],
        "created_at": 1705569239
    }
  ]
}
```

---

## Get Conversations

`GET` `/conversations`

Retrieve the conversation list for the current user, defaulting to the most recent 20 entries.

### Query

- `user` (string) - User identifier, used to define the identity of the end-user for retrieval and statistics. Should be uniquely defined by the developer within the application.
- `last_id` (string) - (Optional) The ID of the last record on the current page, default is null.
- `limit` (int) - (Optional) How many records to return in one request, default is the most recent 20 entries. Maximum 100, minimum 1.
- `sort_by` (string) - (Optional) Sorting Field, Default: -updated_at (sorted in descending order by update time)
  - Available Values: created_at, -created_at, updated_at, -updated_at
  - The symbol before the field represents the order or reverse, "-" represents reverse order.

### Response

- `data` (array[object]) List of conversations
  - `id` (string) Conversation ID
  - `name` (string) Conversation name, by default, is generated by LLM.
  - `inputs` (object) User input parameters.
  - `status` (string) Conversation status
  - `introduction` (string) Introduction
  - `created_at` (timestamp) Creation timestamp, e.g., 1705395332
  - `updated_at` (timestamp) Update timestamp, e.g., 1705395332
- `has_more` (bool)
- `limit` (int) Number of entries returned, if input exceeds system limit, system limit number is returned

#### Request Example

```bash
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/conversations?user=abc-123&last_id=&limit=20' \
--header 'Authorization: Bearer {api_key}'
```

#### Response Example

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
    },
    {
      "id": "hSIhXBhNe8X1d8Et"
      // ...
    }
  ]
}
```

---

## Delete Conversation

`DELETE` `/conversations/:conversation_id`

Delete a conversation.

### Path

- `conversation_id` (string) Conversation ID

### Request Body

- `user` (string) - The user identifier, defined by the developer, must ensure uniqueness within the application.

### Response

- `result` (string) Always returns "success"

#### Request Example

```bash
curl -X DELETE 'http://164579e467f4.ngrok-free.app/v1/conversations/:conversation_id' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{ 
 "user": "abc-123"
}'
```

#### Response

```
204 No Content
```

---

## Conversation Rename

`POST` `/conversations/:conversation_id/name`

Rename the session, the session name is used for display on clients that support multiple sessions.

### Path

- `conversation_id` (string) Conversation ID

### Request Body

- `name` (string) - (Optional) The name of the conversation. This parameter can be omitted if `auto_generate` is set to `true`.
- `auto_generate` (bool) - (Optional) Automatically generate the title, default is `false`
- `user` (string) - The user identifier, defined by the developer, must ensure uniqueness within the application.

### Response

- `id` (string) Conversation ID
- `name` (string) Conversation name
- `inputs` (object) User input parameters
- `status` (string) Conversation status
- `introduction` (string) Introduction
- `created_at` (timestamp) Creation timestamp, e.g., 1705395332
- `updated_at` (timestamp) Update timestamp, e.g., 1705395332

#### Request Example

```bash
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/conversations/:conversation_id/name' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{ 
 "name": "", 
 "auto_generate": true, 
 "user": "abc-123"
}'
```

#### Response Example

```json
{
    "id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
    "name": "Chat vs AI",
    "inputs": {},
    "status": "normal",
    "introduction": "",
    "created_at": 1705569238,
    "updated_at": 1705569238
}
```

---

## Get Conversation Variables

`GET` `/conversations/:conversation_id/variables`

Retrieve variables from a specific conversation. This endpoint is useful for extracting structured data that was captured during the conversation.

### Path Parameters

- `conversation_id` (string) - The ID of the conversation to retrieve variables from.

### Query Parameters

- `user` (string) - The user identifier, defined by the developer, must ensure uniqueness within the application
- `last_id` (string) - (Optional) The ID of the last record on the current page, default is null.
- `limit` (int) - (Optional) How many records to return in one request, default is the most recent 20 entries. Maximum 100, minimum 1.

### Response

- `limit` (int) Number of items per page
- `has_more` (bool) Whether there is a next page
- `data` (array[object]) List of variables
  - `id` (string) Variable ID
  - `name` (string) Variable name
  - `value_type` (string) Variable type (string, number, object, etc.)
  - `value` (string) Variable value
  - `description` (string) Variable description
  - `created_at` (int) Creation timestamp
  - `updated_at` (int) Last update timestamp

### Errors

- 404, `conversation_not_exists`, Conversation not found

#### Request Example

```bash
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/conversations/{conversation_id}/variables?user=abc-123' \
--header 'Authorization: Bearer {api_key}'
```

#### Request with variable name filter

```bash
curl -X GET '${props.appDetail.api_base_url}/conversations/{conversation_id}/variables?user=abc-123&variable_name=customer_name' \
--header 'Authorization: Bearer {api_key}'
```

#### Response Example

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
      "description": "Customer name extracted from the conversation",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    },
    {
      "id": "variable-uuid-2",
      "name": "order_details",
      "value_type": "json",
      "value": "{\"product\":\"Widget\",\"quantity\":5,\"price\":19.99}",
      "description": "Order details from the customer",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    }
  ]
}
```

---

## Speech to Text

`POST` `/audio-to-text`

This endpoint requires a multipart/form-data request.

### Request Body

- `file` (file) - Audio file. Supported formats: `['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']`. File size limit: 15MB
- `user` (string) - User identifier, defined by the developer's rules, must be unique within the application.

### Response

- `text` (string) Output text

#### Request Example

```bash
curl -X POST 'http://164579e467f4.ngrok-free.app/v1/audio-to-text' \
--header 'Authorization: Bearer {api_key}' \
--form 'file=@localfile;type=audio/[mp3|mp4|mpeg|mpga|m4a|wav|webm]'
```

#### Response Example

```json
{
  "text": ""
}
```

---

## Text to Audio

`POST` `/text-to-audio`

Text to speech.

### Request Body

- `message_id` (str) - For text messages generated by Dify, simply pass the generated message-id directly. The backend will use the message-id to look up the corresponding content and synthesize the voice information directly. If both message_id and text are provided simultaneously, the message_id is given priority.
- `text` (str) - Speech generated content.
- `user` (string) - The user identifier, defined by the developer, must ensure uniqueness within the app.

#### Request Example

```bash
curl -o text-to-audio.mp3 -X POST 'http://164579e467f4.ngrok-free.app/v1/text-to-audio' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "message_id": "5ad4cb98-f0c7-4085-b384-88c403be6290",
    "text": "Hello Dify",
    "user": "abc-123"
}'
```

#### Response Headers

```json
{
  "Content-Type": "audio/wav"
}
```

---

## Get Application Basic Information

`GET` `/info`

Used to get basic information about this application

### Response

- `name` (string) application name
- `description` (string) application description
- `tags` (array[string]) application tags
- `mode` (string) application mode
- `author_name` (string) application author name

#### Request Example

```bash
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/info' \
-H 'Authorization: Bearer {api_key}'
```

#### Response Example

```json
{
  "name": "My App",
  "description": "This is my app.",
  "tags": [
    "tag1",
    "tag2"
  ],
  "mode": "advanced-chat",
  "author_name": "Dify"
}
```

---

## Get Application Parameters Information

`GET` `/parameters`

Used at the start of entering the page to obtain information such as features, input parameter names, types, and default values.

### Response

- `opening_statement` (string) Opening statement
- `suggested_questions` (array[string]) List of suggested questions for the opening
- `suggested_questions_after_answer` (object) Suggest questions after enabling the answer.
  - `enabled` (bool) Whether it is enabled
- `speech_to_text` (object) Speech to text
  - `enabled` (bool) Whether it is enabled
- `text_to_speech` (object) Text to speech
  - `enabled` (bool) Whether it is enabled
  - `voice` (string) Voice type
  - `language` (string) Language
  - `autoPlay` (string) Auto play
    - `enabled` Enabled
    - `disabled` Disabled
- `retriever_resource` (object) Citation and Attribution
  - `enabled` (bool) Whether it is enabled
- `annotation_reply` (object) Annotation reply
  - `enabled` (bool) Whether it is enabled
- `user_input_form` (array[object]) User input form configuration
  - `text-input` (object) Text input control
    - `label` (string) Variable display label name
    - `variable` (string) Variable ID
    - `required` (bool) Whether it is required
    - `default` (string) Default value
  - `paragraph` (object) Paragraph text input control
    - `label` (string) Variable display label name
    - `variable` (string) Variable ID
    - `required` (bool) Whether it is required
    - `default` (string) Default value
  - `select` (object) Dropdown control
    - `label` (string) Variable display label name
    - `variable` (string) Variable ID
    - `required` (bool) Whether it is required
    - `default` (string) Default value
    - `options` (array[string]) Option values
- `file_upload` (object) File upload configuration
  - `image` (object) Image settings Currently only supports image types: `png`, `jpg`, `jpeg`, `webp`, `gif`
    - `enabled` (bool) Whether it is enabled
    - `number_limits` (int) Image number limit, default is 3
    - `transfer_methods` (array[string]) List of transfer methods, remote_url, local_file, must choose one
- `system_parameters` (object) System parameters
  - `file_size_limit` (int) Document upload size limit (MB)
  - `image_file_size_limit` (int) Image file upload size limit (MB)
  - `audio_file_size_limit` (int) Audio file upload size limit (MB)
  - `video_file_size_limit` (int) Video file upload size limit (MB)

#### Request Example

```bash
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/parameters'
```

#### Response Example

```json
{
  "opening_statement": "Hello!",
  "suggested_questions_after_answer": {
      "enabled": true
  },
  "speech_to_text": {
      "enabled": true
  },
  "text_to_speech": {
      "enabled": true,
      "voice": "sambert-zhinan-v1",
      "language": "zh-Hans",
      "autoPlay": "disabled"
  },
  "retriever_resource": {
      "enabled": true
  },
  "annotation_reply": {
      "enabled": true
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
  "file_upload": {
      "image": {
          "enabled": false,
          "number_limits": 3,
          "detail": "high",
          "transfer_methods": [
              "remote_url",
              "local_file"
          ]
      }
  },
  "system_parameters": {
      "file_size_limit": 15,
      "image_file_size_limit": 10,
      "audio_file_size_limit": 50,
      "video_file_size_limit": 100
  }
}
```

---

## Get Application Meta Information

`GET` `/meta`

Used to get icons of tools in this application

### Response

- `tool_icons`(object[string]) tool icons
  - `tool_name` (string)
    - `icon` (object|string)
      - (object) icon object
        - `background` (string) background color in hex format
        - `content`(string) emoji
      - (string) url of icon

#### Request Example

```bash
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/meta' \
-H 'Authorization: Bearer {api_key}'
```

#### Response Example

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

---

## Get Application WebApp Settings

`GET` `/site`

Used to get the WebApp settings of the application.

### Response

- `title` (string) WebApp name
- `chat_color_theme` (string) Chat color theme, in hex format
- `chat_color_theme_inverted` (bool) Whether the chat color theme is inverted
- `icon_type` (string) Icon type, `emoji` - emoji, `image` - picture
- `icon` (string) Icon. If it's `emoji` type, it's an emoji symbol; if it's `image` type, it's an image URL
- `icon_background` (string) Background color in hex format
- `icon_url` (string) Icon URL
- `description` (string) Description
- `copyright` (string) Copyright information
- `privacy_policy` (string) Privacy policy link
- `custom_disclaimer` (string) Custom disclaimer
- `default_language` (string) Default language
- `show_workflow_steps` (bool) Whether to show workflow details
- `use_icon_as_answer_icon` (bool) Whether to replace 🤖 in chat with the WebApp icon

#### Request Example

```bash
curl -X GET 'http://164579e467f4.ngrok-free.app/v1/site' \
-H 'Authorization: Bearer {api_key}'
```

#### Response Example

```json
{
  "title": "My App",
  "chat_color_theme": "#ff4a4a",
  "chat_color_theme_inverted": false,
  "icon_type": "emoji",
  "icon": "😄",
  "icon_background": "#FFEAD5",
  "icon_url": null,
  "description": "This is my app.",
  "copyright": "all rights reserved",
  "privacy_policy": "",
  "custom_disclaimer": "All generated by AI",
  "default_language": "en-US",
  "show_workflow_steps": false,
  "use_icon_as_answer_icon": false,
}
```

---

## Get Annotation List

`GET` `/apps/annotations`

### Query

- `page` (string) - Page number
- `limit` (string) - Number of items returned, default 20, range 1-100

#### Request Example

```bash
curl --location --request GET 'undefined/apps/annotations?page=1&limit=20' \
--header 'Authorization: Bearer {api_key}'
```

#### Response Example

```json
{
  "data": [
    {
      "id": "69d48372-ad81-4c75-9c46-2ce197b4d402",
      "question": "What is your name?",
      "answer": "I am Dify.",
      "hit_count": 0,
      "created_at": 1735625869
    }
  ],
  "has_more": false,
  "limit": 20,
  "total": 1,
  "page": 1
}
```

---

## Create Annotation

`POST` `/apps/annotations`

### Query

- `question` (string) - Question
- `answer` (string) - Answer

#### Request Example

```bash
curl --location --request POST 'undefined/apps/annotations' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{"question": "What is your name?","answer": "I am Dify."}'
```

#### Response Example

```json
{
  "id": "69d48372-ad81-4c75-9c46-2ce197b4d402",
  "question": "What is your name?",
  "answer": "I am Dify.",
  "hit_count": 0,
  "created_at": 1735625869
}
```

---

## Update Annotation

`PUT` `/apps/annotations/{annotation_id}`

### Query

- `annotation_id` (string) - Annotation ID
- `question` (string) - Question
- `answer` (string) - Answer

#### Request Example

```bash
curl --location --request PUT 'undefined/apps/annotations/{annotation_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{"question": "What is your name?","answer": "I am Dify."}'
```

#### Response Example

```json
{
  "id": "69d48372-ad81-4c75-9c46-2ce197b4d402",
  "question": "What is your name?",
  "answer": "I am Dify.",
  "hit_count": 0,
  "created_at": 1735625869
}
```

---

## Delete Annotation

`DELETE` `/apps/annotations/{annotation_id}`

### Query

- `annotation_id` (string) - Annotation ID

#### Request Example

```bash
curl --location --request DELETE 'undefined/apps/annotations/{annotation_id}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json'
```

#### Response

```
204 No Content
```

---

## Initial Annotation Reply Settings

`POST` `/apps/annotation-reply/{action}`

### Query

- `action` (string) - Action, can only be 'enable' or 'disable'
- `embedding_provider_name` (string) - Specified embedding model provider, must be set up in the system first, corresponding to the provider field(Optional)
- `embedding_model_name` (string) - Specified embedding model, corresponding to the model field(Optional)
- `score_threshold` (number) - The similarity threshold for matching annotated replies. Only annotations with scores above this threshold will be recalled.

The provider and model name of the embedding model can be obtained through the following interface: v1/workspaces/current/models/model-types/text-embedding. For specific instructions, see: Maintain Knowledge Base via API. The Authorization used is the Dataset API Token.

#### Request Example

```bash
curl --location --request POST 'undefined/apps/annotation-reply/{action}' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{"score_threshold": 0.9, "embedding_provider_name": "zhipu", "embedding_model_name": "embedding_3"}'
```

#### Response Example

```json
{
  "job_id": "b15c8f68-1cf4-4877-bf21-ed7cf2011802",
  "job_status": "waiting"
}
```

This interface is executed asynchronously, so it will return a job_id. You can get the final execution result by querying the job status interface.

---

## Query Initial Annotation Reply Settings Task Status

`GET` `/apps/annotation-reply/{action}/status/{job_id}`

### Query

- `action` (string) - Action, can only be 'enable' or 'disable', must be the same as the action in the initial annotation reply settings interface
- `job_id` (string) - Job ID, obtained from the initial annotation reply settings interface

#### Request Example

```bash
curl --location --request GET 'undefined/apps/annotation-reply/{action}/status/{job_id}' \
--header 'Authorization: Bearer {api_key}'
```

#### Response Example

```json
{
  "job_id": "b15c8f68-1cf4-4877-bf21-ed7cf2011802",
  "job_status": "waiting",
  "error_msg": ""
}
```