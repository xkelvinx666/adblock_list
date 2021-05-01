'use strict';
const axios = require('axios');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const dayjs = require('dayjs')

const {hostsList, piholeList} = require('./adlist');

function hostsToDomins(text) {
    return _.flatten(text.replace(/0.0.0.0/g, '')
        .replace(/127.0.0.1/g, '')
        .replace(/::1 /g, '')
        .split('\n')
        .map((t) => t.trim())
        .filter(t => !_.isEmpty(t)));
}

function addUpdateInformation(domains) {
    const number = domains.filter(d => !d.includes('#')).length;
    const timeInformation = `# all update at ${dayjs().format('YYYY/MM/DD HH:mm')}`;
    const totalInformation = `# total domains: ${number}`;
    return [].concat([timeInformation, totalInformation, '###############', '###############']).concat(domains);
}

function domainsToHosts(text) {
    return text.split('\n').map(t => t.includes('#') ? t : `127.0.0.1 ${t}`).join('\n');
}

function toDnsmasq(text) {
    return text.split('\n').map(t => t.includes('#') ? t : `address=/${t}/`).join('\n');
}

function toAdGuardHome(text) {
    return text.split('\n').map(t => t.includes('#') ? t : `||${t}^`).join('\n');
}
function toSmartDNS(text) {
    return text.split('\n').map(t => t.includes('#') ? t : `address /${t}/#`).join('\n');
}

function toSurge(text) {
    return text.split('\n').map(t => t.includes('#') ? t : `DOMAIN-SUFFIX,${t}`).join('\n');
}

function toSurge2(text) {
    return text.split('\n').map(t => t.includes('#') ? t : `.${t}`).join('\n');
}

exports.updateDomains = () => {
    const requests = [...hostsList, ...piholeList].map(url => axios.get(url));
    const distDic = path.resolve('dist');
    return Promise.all(requests).then((responses) => {
        return addUpdateInformation(_.uniq(_.union(...responses.map(({data}) => hostsToDomins(data))))).join('\n');
    }).then((text) => {
        return Promise.all([
            fs.outputFile(`${distDic}/hosts.txt`, domainsToHosts(text)),
            fs.outputFile(`${distDic}/pi-hole.txt`, text),
            fs.outputFile(`${distDic}/dnsmasq.conf`, toDnsmasq(text)),
            fs.outputFile(`${distDic}/ad-guard-home.txt`, toAdGuardHome(text)),
            fs.outputFile(`${distDic}/surge.txt`, toSurge(text)),
            fs.outputFile(`${distDic}/surge2.txt`, toSurge2(text)),
            fs.outputFile(`${distDic}/smart-dns.conf`, toSmartDNS(text))
        ]);
    }).catch(console.log);
};
