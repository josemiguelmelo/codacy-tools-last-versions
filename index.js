const axios = require('axios');
const fs = require('fs');
const { tools, exceptions } = require('./tools');

const initAxios = (token) => axios.defaults.headers.common['Authorization'] = `token ${token}`

const failedPrint = (reposName, error) => console.error(`${reposName}: ${error}`)

const apiTagsEndpoint = (reposName) => `https://api.github.com/repos/codacy/${reposName}/tags`

const getTagsForRepository = async (reposName) => {
    const endpoint = apiTagsEndpoint(reposName);
    return await axios.get(endpoint);
}

const toolInfoToString = (info) => `codacy/${info.name}:${info.tag}`

const currentToolInformation = (reposName) => {
    const exception = exceptions.find(elem => elem.name == reposName)
    return exception == undefined ? { name: reposName, tag: undefined } : exception
}

const toolInfo = async (reposName) => {
    const currentTool = currentToolInformation(reposName);

    if (currentTool.tag == undefined) {
        const reposTags = await getTagsForRepository(reposName);
        currentTool.tag = reposTags.data[0].name
    } else {
        failedPrint(reposName, "still doesn't have version or the repository name is invalid")
    }

    return currentTool;
}

const tail = (arr) => arr.slice(1);

const fetchTagsRecursive = async (reposName, toolsList, acc) => {
    try {
        const currentTool = await toolInfo(reposName);
        acc.push(currentTool)
    } catch (error) {
        failedPrint(reposName, error)
    }

    if (toolsList.length > 0) {
        return await fetchTagsRecursive(toolsList[0], tail(toolsList), acc);
    }
    else {
        return acc
    }
}

const fetchTags = async (toolsList) =>
    await fetchTagsRecursive(toolsList[0], tail(toolsList), [])

const writeToFile = (filename, content) => {
    fs.writeFile(filename, content, (err) => {
        if (err) console.error(err);
    });
}

const run = async (outputFile) => {
    initAxios(process.env.GITHUB_TOKEN);
    const tags = await fetchTags(tools);
    const resultString = tags.map(t => toolInfoToString(t)).join('\n');
    writeToFile(outputFile, resultString + '\n');
}

run("tool-tags.txt");
