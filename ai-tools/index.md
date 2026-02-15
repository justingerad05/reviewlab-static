---
layout: base.njk
title: Best AI Tools (2026)
permalink: /ai-tools/
---

<h1>Best AI Tools (2026)</h1>

<ul>
{% for category in collections.aiToolsCategories %}
<li>
<a href="{{ category.url }}">
{{ category.data.title }}
</a>
</li>
{% endfor %}
</ul>
