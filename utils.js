async function splitNumberedString(inputString) {
    const inputList = inputString.split(/\n+/);
    
    const outputList = inputList.map(item => {
        return item.replace(/\d+[\.\)] /g, "").trim();
    });

    return outputList.filter(item => item !== "");
}

function shuffleList(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatQuoteComments(issueText) {
    const lines = issueText.split('\r\n');
    
    const result = [];

    lines.forEach(line => {
        const parts = line.split(' ');

        // calculate the number of ">" in the beginning of the line
        const level = parts.reduce((count, part) => part === '>' ? count + 1 : count, 0);

        // remove all ">" in the beginning of the line
        const text = parts.filter(part => part !== '>' && part !== '').join(' ').trim();

        // only add the line if it is not empty
        if (text) {
            result.push({
                level,
                text
            });
        }
    });

    return result;
}

function createQuoteComment(originalComment, replyText) {
    const quotedComment = originalComment.split('\r\n').map(line => line ? '> ' + line : '>').join('\r\n');
    
    const fullComment = `${quotedComment}\r\n\r\n${replyText}`;

    return fullComment;
}

function getRoleByLevel(level) {
    if (level % 2 === 0) {
        return 'user'
    } else {
        return 'assistant'
    }
}

module.exports = {
    splitNumberedString,
    shuffleList,
    random,
    formatQuoteComments,
    createQuoteComment,
    getRoleByLevel
}