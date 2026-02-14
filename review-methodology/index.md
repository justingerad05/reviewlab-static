fs.mkdirSync("review-methodology",{recursive:true});

fs.writeFileSync("review-methodology/index.html",`
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review Methodology</title>
<link rel="canonical" href="${SITE_URL}/review-methodology/">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<h1>Our Review Methodology</h1>

<p>
Every tool is evaluated using structured criteria:
feature depth, usability, pricing transparency,
integration capability, long-term sustainability,
and real-world use-case alignment.
</p>

<p>
We do not publish anonymous ratings.
We do not accept paid placements.
All evaluations are independent.
</p>

</body>
</html>
`);
