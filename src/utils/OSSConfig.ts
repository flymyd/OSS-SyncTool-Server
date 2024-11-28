import * as crypto from 'crypto';

interface OSSConfig {
    policyBase64: string;
    accessid: string;
    signature: string;
    host: string;
    expire: number;
}

export function getOSSConfig(env: 'dev' | 'test' | 'prod'): OSSConfig {
    const bucketMap = {
        dev: 'bearfun-dev',
        test: 'bearfun-test',
        prod: 'bearfun-prod'
    };

    const host = `https://${bucketMap[env]}.oss-accelerate.aliyuncs.com`;
    const accessId = process.env.OSS_ACCESS_KEY_ID;
    const accessKey = process.env.OSS_ACCESS_KEY_SECRET;
    if (!accessId || !accessKey) {
        throw new Error('OSS配置错误：未找到 AccessKey 配置');
    }

    const timeout = 1; // 限制参数的生效时间(单位:小时)
    const expireTime = new Date(new Date().getTime() + timeout * 3600 * 1000);
    const expiration = expireTime.toISOString();

    const policyText = {
        expiration,
        conditions: [
            ['content-length-range', 0, 1048576000],
        ]
    };

    const policy = Buffer.from(JSON.stringify(policyText)).toString('base64');
    const signature = crypto
        .createHmac('sha1', accessKey)
        .update(Buffer.from(policy))
        .digest('base64');

    return {
        policyBase64: policy,
        accessid: accessId,
        signature: signature,
        host,
        expire: expireTime.getTime()
    };
} 