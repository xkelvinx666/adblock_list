'use strict';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs-extra');
const simpleGit = require('simple-git');
const git = simpleGit();

const {hostsList, piholeList} = require('./adlist');

function hostsToDomins(text) {
    return _.flatten(text.replace(/0.0.0.0/g, '')
        .replace(/127.0.0.1/g, '')
        .replace(/::1 /g, '')
        .split('\n')
        .map((t) => t.trim())
        .filter(t => !_.isEmpty(t)));
}

exports.updateDomains = () => {
    const requests = [...hostsList, ...piholeList].map(url => axios.get(url));
    return Promise.all(requests).then((responses) => {
        return _.uniq(_.union(...responses.map(({data}) => hostsToDomins(data)))).join('\n');
    }).then((text) => {
        return fs.outputFile('domains.txt', text);
    }).then(() => {
        return git.add('./*')
            .addConfig('user.name', 'daily update cmd')
            .addConfig('user.email', 'noone@nobody.com')
            .commit("daily update")
            .push(['-u', 'origin', 'master'], () => console.log('daily update done'));
    }).catch(console.log);
};