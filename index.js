const openai = require('openai');
const fetch = require('node-fetch');
const regex = /\d+[\.\)] /g;
const github = require('@actions/github');

openai.apiKey = process.env.OPENAI_API_KEY;
const githubToken = process.env.GITHUB_TOKEN;

async function getChatResponse(prompt) {
    const response = await openai.ChatCompletion.create({
        model: "gpt-3.5-turbo-0613",
        temperature: 0.92,
        messages: [
            { role: "system", content: "You are a helpful assistant" },
            { role: "user", content: prompt },
        ],
    });

    return response['choices'][0]['message']['content'];
}

async function splitNumberedString(inputString) {
    const inputList = inputString.split('\n+');
    
    const outputList = inputList.map(item => {
        return item.replace(regex, "").trim();
    });

    return outputList.filter(item => item !== "");
}

async function getQuestionCommentBatch(article) {
    const count = random.int(2, 5);

    const prompt = `假设您是一位擅于思考的人，您总能从不同角度提出富含深度的问题。

    这是我的文章：
    ${article}

    现在允许每个人提出${count}个问题，您阅读过后提出了${count}个天马行空的问题，并用数字序号分隔开，您问到：`;

    const comments = await getChatResponse(prompt);
    return await splitNumberedString(comments);
}

// Similar functions for getIdeaCommentBatch, getErrorComment, getEncourageCommentBatch
async function getIdeaCommentBatch(article) {
    const count = random.int(2, 5);

    const prompt = `假设您是一名十分擅于思考的百事通，您总是能在别人的观点之上延伸出更多想法。

    这是我的文章：
    ${article}

    现在允许每个人提出{count}个想法，您阅读过后提出了{count}个跳跃性的且颇具深度的想法，并用数字序号分隔开, 您说到：`;

    const comments = await getChatResponse(prompt);
    return await splitNumberedString(comments);
}

async function getErrorComment(article) {
    const prompt = `假设您是一名语言专家，您擅长发现文章里的语言表达和语法问题。

    这是我的文章：
    ${article}

    您阅读完后提出了内容里的一些问题和其整体需要改进的地方，并告诉我改正优化的方案及原因，您说到：`;

    const comments = await getChatResponse(prompt);
    return comments;
}

async function getEncourageCommentBatch(article) {
    const count = random.int(2, 5);

    const prompt = `假设您是一名慧眼识珠的伯乐，擅长给予别人肯定以表示鼓励。

    这是我的文章：
    ${article}

    您阅读完后，针对我的思考给予了{count}点赞扬，并用数字序号分隔开，您用口语化的语气说到：`;

    const comments = await getChatResponse(prompt);
    return await splitNumberedString(comments);
}

function isArticle() {
    const context = github.context
    return context.eventName === 'issues' && context.payload.action === 'opened' && context.payload.issue.labels.some(label => label.name === 'article')
}

// main
async function main() {
    const context = github.context

    if (isArticle()) {

        const article = context.issue.body;

        const results = await Promise.all([
            getErrorComment(article),
            getQuestionCommentBatch(article),
            getIdeaCommentBatch(article),
            getEncourageCommentBatch(article)
        ]);

        const comments = [results[0], ...results[1], ...results[2], ...results[3]];

        shuffleList(comments);

        await postComments(comments);

        const url = event['issue']['comments_url'];
        const headers = {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
        };

        for (let content of comments) {
            const data = { 'body': content };
            const response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(data) });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
    }
}

async function postComments(comments) {
    const octokit = github.getOctokit(githubToken)
    const context = github.context
    const { owner, repo } = context.repo
    const { number } = context.issue

    for (let content, i = 0; content = comments[i++];) {
        await octokit.issues.createComment({
            owner,
            repo,
            issue_number: number,
            body: content
        })
    }
}

function shuffleList(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
}

main().catch(e => console.error(e));
