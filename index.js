const github = require('@actions/github');
const { getContentLanguage } = require('./classify-utils');
const {
    getQuestionCommentBatch,
    getEncourageCommentBatch,
    getWritingGuide,
    replyToComment,
    getCriticalCommentBatch,
} = require('./comment');
const { shuffleList } = require('./utils');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// get config data
function getConfigData() {
    try {
        const config = JSON.parse(process.env.COMMENT_CONFIG);
        return config;
    } catch (error) {
        throw new Error(`Invalid config data: ${error.message}`);
    }
}

function isArticle() {
    const { payload } = github.context
    return payload.issue && payload.action === 'opened' && payload.issue.labels.some(label => label.name === 'article')
}

function isComment() {
    const { payload } = github.context
    return payload.action === 'created' && payload.comment?.author_association === 'OWNER'
}

async function postComments(comments) {
    const octokit = github.getOctokit(GITHUB_TOKEN)
    const context = github.context
    const { owner, repo } = context.repo
    const { number } = context.issue

    for (let content, i = 0; content = comments[i++];) {
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: number,
            body: content
        })
    }
}

// main
async function main() {
    const context = github.context

    if (isArticle()) {
        const { body, title } = context.payload.issue;
        const article = `${title}\n${body}`;

        const config = await getConfigData();

        const language = await getContentLanguage(article);

        const tasks = [
            config.writing_guide ? getWritingGuide(article, language) : null,
            config.questioner ? getQuestionCommentBatch(article, { language, ...config.questioner }) : null,
            config.encourager ? getEncourageCommentBatch(article, { language, ...config.encourager }) : null,
            config.critical ? getCriticalCommentBatch(article, { language, ...config.critical }) : null
        ].filter(task => task !== null);

        if (tasks.length === 0) return;

        const results = await Promise.all(tasks);

        const comments = results.flat();

        shuffleList(comments);

        await postComments(comments);
    } else if (isComment()) {
        const { issue, comment } = context.payload;
        const article = `${issue.title}\n${issue.body}`;
        const comments = formatQuoteComments(comment.body);
        const history = comments.map(comment => ({ role: getRoleByLevel(comment.level), content: comment.text }));
        const response = await replyToComment(article, history);
        const replyText = createQuoteComment(comment.body, response);
        await postComments([replyText]);
    }
}

main().then(() => {
    process.exit();
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });