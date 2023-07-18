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

COMMENT_CONFIG: json

example:

``` json
{
    "critical": { "min": 2, "max": 5 },
    "questioner": { "min": 2, "max": 4 },
    "encourager": { "min": 1, "max": 2 },
    "writing_guide": true
}
```
`critical`: reader with critical thinking
`questioner`: readers who ask questions
`encourager`: encourager
`writing_guide`: whether to use writing guide
