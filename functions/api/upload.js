// 星盒启A · 图片上传 → GitHub 私人仓库 scratchpad
// 环境变量（Cloudflare 后台已配置为 Secret）：
//   GH_TOKEN    = Personal Access Token
//   GH_OWNER    = GitHub 用户名
//   UPLOAD_KEY  = 上传密钥

export async function onRequest(context) {
  const { request, env } = context;
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors });
  }

  const token = env.GH_TOKEN;
  const owner = env.GH_OWNER;
  const repo = 'scratchpad';

  if (!token || !owner) {
    return new Response(JSON.stringify({ ok: false, error: '服务端配置缺失' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  try {
    const form = await request.formData();
    const file = form.get('image');

    if (!file) {
      return new Response(JSON.stringify({ ok: false, error: '未收到图片' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ ok: false, error: '只支持图片' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 生成文件名
    const ext = file.name.split('.').pop() || 'png';
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth()+1).padStart(2,'0') +
      String(now.getDate()).padStart(2,'0');
    const timeStr = String(now.getHours()).padStart(2,'0') +
      String(now.getMinutes()).padStart(2,'0') +
      String(now.getSeconds()).padStart(2,'0');
    const rand = Math.random().toString(36).substring(2, 6);
    const fileName = `xhqa_${dateStr}_${timeStr}_${rand}.${ext}`;
    const path = `uploads/${fileName}`;

    // 读取文件内容 → base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64Content = btoa(binary);

    // 调用 GitHub API 上传
    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'scratchpad-uploader'
        },
        body: JSON.stringify({
          message: `上传: ${fileName}`,
          content: base64Content,
          branch: 'main'
        })
      }
    );

    const ghData = await ghRes.json();

    if (!ghRes.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: ghData.message || 'GitHub上传失败'
      }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 只返回文件名
    return new Response(JSON.stringify({
      ok: true,
      fileName: fileName,
      path: path
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: e.message
    }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}
