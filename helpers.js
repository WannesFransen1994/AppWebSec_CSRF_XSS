
const crypto = require('node:crypto');
const { Buffer } = require('node:buffer');

function generate_jwt(email) {
    let jwt_header = { "alg": "HS256", "typ": "JWT" }
    let jwt_payload = { "email": email }

    let header_encoded = Buffer.from(JSON.stringify(jwt_header)).toString("base64url")
    let payload_encoded = Buffer.from(JSON.stringify(jwt_payload)).toString("base64url")
    let signature = crypto.createHmac('sha256', process.env.JWT_SECRET).update(header_encoded + "." + payload_encoded).digest("base64url");

    let jwt = header_encoded + "." + payload_encoded + "." + signature;

    return jwt
}

function verify_jwt(jwt) {
    let splitted_jwt = jwt.split(".");

    let tbv_header = splitted_jwt[0]
    let tbv_payload = splitted_jwt[1]
    let tbv_signature = splitted_jwt[2]

    let valid_or_not = crypto.createHmac('sha256', process.env.JWT_SECRET).update(tbv_header + "." + tbv_payload).digest("base64url") == tbv_signature;

    return valid_or_not
}

function get_jwt_payload(jwt) {
    let splitted_jwt = jwt.split(".");

    let tbv_payload = Buffer.from(splitted_jwt[1], 'base64url').toString("utf8")
    return JSON.parse(tbv_payload)
}

function unix_ts() {
    return Math.floor(Date.now() / 1000)
}

module.exports = { generate_jwt, verify_jwt, get_jwt_payload, unix_ts };