import os
import json
import requests
import openai
import asyncio
import random
import re

openai.api_key = os.getenv("OPENAI_API_KEY")

github_token = os.getenv("GITHUB_TOKEN")


def get_chat_response(prompt):
    chat = openai.ChatCompletion.create(
      model="gpt-3.5-turbo-0613",
      temperature=0.92,
      messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": prompt},
        ]
    )
    return chat['choices'][0]['message']['content']

async def aget_chat_response(prompt):
    return await asyncio.get_event_loop().run_in_executor(None, get_chat_response, prompt)

def split_numbered_string(input_string):
    input_list = re.split('\n+', input_string)
    
    output_list = []

    for item in input_list:
        new_item = re.sub(r"\d+[\.\)] ", "", item)
        output_list.append(new_item.strip())

    # filter out empty string
    output_list = list(filter(None, output_list))

    return output_list

# def get_article_language(article):

def get_question_comment(article, comments):
    first_question_ending = "现在允许每个人提出一个问题，您阅读过后提出了一个天马行空的问题，您问到："
    other_question_ending = "现在允许每个人提出一个问题，您阅读过后提出了一个与其他人不同的天马行空的问题，您问到："
    question_ending = first_question_ending if len(comments) == 0 else other_question_ending
    comment_context = "\n\n".join(comments) if len(comments) > 0 else ""
    prompt = f"""假设您是一位擅于思考的人，您总能从不同角度提出富含深度的问题。
    
    这是我的文章：
    {article}
    {comment_context}

    {question_ending}
    """
    return get_chat_response(prompt)

def get_question_comment_batch(article):
    count = random.randint(2, 5)

    prompt = f"""假设您是一位擅于思考的人，您总能从不同角度提出富含深度的问题。

    这是我的文章：
    {article}

    现在允许每个人提出{count}个问题，您阅读过后提出了{count}个天马行空的问题，并用数字序号分隔开，您问到：
    """
    comments = get_chat_response(prompt)
    return split_numbered_string(comments)

def get_idea_comment_batch(article):
    count = random.randint(2, 5)

    prompt = f"""假设您是一名十分擅于思考的百事通，您总是能在别人的观点之上延伸出更多想法。

    这是我的文章：
    {article}

    现在允许每个人提出{count}个想法，您阅读过后提出了{count}个跳跃性的且颇具深度的想法，并用数字序号分隔开, 您说到：
    """
    comments = get_chat_response(prompt)
    return split_numbered_string(comments)

def get_error_comment(article):
    prompt = f"""假设您是一名语言专家，您擅长发现文章里的语言表达和语法问题。

    这是我的文章：
    {article}

    您阅读完后提出了内容里的一些问题和其整体需要改进的地方，并告诉我改正优化的方案及原因，您说到：
    """
    return get_chat_response(prompt)

def get_encourage_comment_batch(article):
    count = random.randint(1, 4)

    prompt = f"""假设您是一名慧眼识珠的伯乐，擅长给予别人肯定以表示鼓励。

    这是我的文章：
    {article}

    您阅读完后，针对我的思考给予了{count}点赞扬，并用数字序号分隔开，您用口语化的语气说到：
    """
    comments = get_chat_response(prompt)
    return split_numbered_string(comments)

def get_combined_response(contents):
    # combined response
    content = "\n\n".join(contents)
    combined_response_prompt = f"假设您十分擅长整合内容，要整合以下内容：\n\n{content}\n\n请您以“你”的人称代词和中文回复整合后的内容："
    return get_chat_response(combined_response_prompt)

# main
async def main():
    with open(os.getenv("GITHUB_EVENT_PATH")) as f:
        event = json.load(f)

    if event['action'] == 'opened' and any(label['name'] == 'article' for label in event['issue']['labels']):

        article = event['issue']['body']

        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(None, get_error_comment, article),
            loop.run_in_executor(None, get_question_comment_batch, article),
            loop.run_in_executor(None, get_idea_comment_batch, article),
            loop.run_in_executor(None, get_encourage_comment_batch, article)
        ]

        results = await asyncio.gather(*tasks)

        comments = [results[0]]
        comments.extend(results[1])
        comments.extend(results[2])
        comments.extend(results[3])

        random.shuffle(comments)

        url = event['issue']['comments_url']
        headers = {
            'Authorization': f"token {github_token}",
            'Accept': 'application/vnd.github.v3+json',
        }
        for content in comments:
            data = {
                'body': content,
            }
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()

if __name__ == '__main__':
    asyncio.run(main())
