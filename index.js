const crypto = require('crypto');
const { default: axios } = require('axios');
const fs = require('fs');
const path = require('path');

const USER_ID = '2864f75036a511eebaab52540025c377';

function buildAfdianApiRequestBody(params) {
    const token = process.env.AFDIAN_TOKEN;

    if (!token) {
        throw new Error('AFDIAN_TOKEN is empty')
    }

    const ts = Math.floor(Date.now() / 1000);
    const paramsString = JSON.stringify(params);

    const hash = crypto.createHash('md5');
    hash.update(`${token}params${paramsString}ts${ts}user_id${USER_ID}`);
    const sign = hash.digest().toString('hex');

    return {
        user_id: USER_ID,
        params: paramsString,
        ts,
        sign,
    };
}

async function requestAfdian(url, params) {
    const body = buildAfdianApiRequestBody(params);
    const res = await axios.post(url, body, {
        responseType: 'json',
    });
    const data = res.data;

    if (data.ec !== 200) {
        console.error(data);
        throw new Error(data.em);
    }

    return data.data;
}

async function getSponsors(page = 1, perPage = 20) {
    const sponsors = await requestAfdian(
        'https://afdian.net/api/open/query-sponsor',
        {
            page,
            per_page: perPage,
        }
    );

    return sponsors;
}

async function main() {
    let page = 1;
    const sponsors = [];

    while (true) {
        const current = await getSponsors(page);
        if (current.list.length === 0) break;

        sponsors.push(
            ...current.list.map((item) => ({
                id: item.user.user_id,
                name: item.user.name,
                avatar: item.user.avatar,
            }))
        );
        page++;
    }

    fs.writeFileSync(
        path.resolve(__dirname, 'sponsors.json'),
        JSON.stringify(sponsors, null, 2)
    );
}

main();
