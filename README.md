# BLOG in ISSUE

## How to use

1. fork this repo.
2. setting secrets and variables in actions settings.
3. create a new issue, and add a label `article`.
4. write your article in the issue, and submit it.

## Actions Settings

You need to create `New repository secret` that named `production`.

### Secrets

OPENAI_API_KEY: [token](https://platform.openai.com/account/api-keys)

### Variables

COMMENT_CONFIG

``` json
{
    "critical": { "min": number, "max": number }, // reader with critical thinking
    "questioner": { "min": number, "max": number }, // Readers who ask questions
    "encourager": { "min": number, "max": number }, // Encourager
    "writing_guide": boolean // Whether to use writing guide
}
```
