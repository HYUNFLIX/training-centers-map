const { onRequest } = require("firebase-functions/v2/https");

const NAVER_CLIENT_ID = "nQzRhczvTq8q3mu8MzlA";
const NAVER_CLIENT_SECRET = "Ryo3nBB0Hv";

exports.naverSearch = onRequest({ cors: true, region: "asia-northeast3" }, async (req, res) => {
  const query = req.query.query;
  if (!query) {
    res.status(400).json({ error: "query 파라미터가 필요합니다." });
    return;
  }

  const display = req.query.display || 20;
  const sort = req.query.sort || "random";

  try {
    const naverUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
    const response = await fetch(naverUrl, {
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
