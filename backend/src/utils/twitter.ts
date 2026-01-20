import axios from 'axios';
import { TwitterOpenApi } from 'twitter-openapi-typescript';

interface CookieObject {
  [key: string]: string;
}

export interface TwitterClient {
  getTweetApi: () => any;
  getUserApi: () => any;
  getV11PostApi: () => any;
  getUserListApi: () => any;
}

export const createXClient = async (authToken: string): Promise<{ client: TwitterClient; restId: string | null }> => {
  // 通过 X.com 的 manifest.json 接口获取 cookies
  const resp = await axios.get('https://x.com/manifest.json', {
    headers: {
      cookie: `auth_token=${authToken}`,
    },
  });

  const resCookie = resp.headers['set-cookie'] as string[];
  const cookieObj = resCookie.reduce((acc: CookieObject, cookie: string) => {
    const [name, value] = cookie.split(';')[0].split('=');
    acc[name] = value;
    return acc;
  }, {});

  console.log('Cookies:', JSON.stringify(cookieObj, null, 2));

  const api = new TwitterOpenApi();
  const client = await api.getClientFromCookies({ ...cookieObj, auth_token: authToken });
  const restId = extractRestIdFromCookies(cookieObj);

  return {
    client: client as unknown as TwitterClient,
    restId
  };
};

// 从 cookies 中提取 restId
export const extractRestIdFromCookies = (cookieObj: CookieObject): string | null => {
  const twid = cookieObj.twid;
  if (!twid) return null;

  // twid 格式: u%3D{userId} 或 u={userId}
  const match = twid.match(/u(?:%3D|=)(\d+)/);
  return match ? match[1] : null;
};
