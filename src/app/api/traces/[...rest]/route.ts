export const GET = async (
  req: Request,
  { params }: { params: { rest: string[] } },
) => {
  const url = `https://globe.adsbexchange.com/data/traces/${params.rest.map((s) => decodeURIComponent(s)).join("/")}`;
  console.log("fetching", url);
  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "en-GB,en;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://globe.adsbexchange.com/",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
    },
  });

  const json = (await response.json()) as Record<string, unknown>;

  return Response.json(json);
};
