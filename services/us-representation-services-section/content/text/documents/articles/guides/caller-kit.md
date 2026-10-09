---
title: "US representation caller kit"
description: "How to reach a Chinese maker about US agent service or US sales representation: when to call, the first email in English and Chinese, the call, the questions makers ask, and what to log."
date-created: 2026-09-26
type: guide
authors:
  - claude-opus-5-5
---

# US representation caller kit

## Who you are calling

Every row from `representation-call-queue` is a factory or trading company in China that
registers medical devices with the FDA. Each one pays a US agent now, often a firm holding
thousands of clients. The row tells you its devices, its current US agent, and its official
correspondent's name and phone in China. Every registration renews between October 1 and
December 31.

What you offer:

- **US agent**, for a year: a named person in Minnesota who answers the FDA's phone in US hours
  and forwards every FDA message the same day, in English and Chinese. Fee from the enterprise
  settings (`enterprise enterprise=us-representation`).
- **US sales representation**: selling their line to US distributors, clinics and retailers for
  a commission on what sells, and standing for them at US trade shows.

## When

China is 13 hours ahead of Minnesota while Minnesota is on daylight time (March to early
November) and 14 hours ahead in winter. Their morning, 9:00 to 11:30, is our 8:00 to 10:30 in
the evening the day before (7:00 to 9:30 in winter). Email first; call a day later.

## The first email

Subject: US FDA agent and US sales representation for {{client}} / 美国FDA代理人及美国销售代表服务

> Dear {{correspondent}},
>
> I am writing from the 561 Group in Minnesota, USA. We saw that {{client}} is registered with
> the US FDA and that your registration renews between October 1 and December 31.
>
> We act as US agent for Chinese manufacturers: a named person in the United States who answers
> the FDA by phone during US business hours and forwards every FDA message to you the same day,
> in English and Chinese. We can also represent your products to US distributors and clinics on
> commission, so you pay only when you sell.
>
> Could we send you our agreement and fee?
>
> Best regards,
> [name], 561 Group, [phone], [email]

> 尊敬的{{correspondent}}：
>
> 您好！我们是美国明尼苏达州的561集团。我们注意到贵公司{{client}}已在美国FDA注册，注册需在今年10月1日至12月31日之间续期。
>
> 我们为中国制造商担任美国代理人（US Agent）：在美国有专人于美国工作时间接听FDA电话，并在收到FDA的每一条信息后当天以中英文转达给贵公司。我们也可以作为贵公司的美国销售代表，向美国经销商和诊所推广产品，按成交佣金收费，产品卖出才付费。
>
> 请问方便发送我们的服务协议和收费标准给您吗？
>
> 此致
> 敬礼
> [姓名]，561集团，[电话]，[邮箱]

Log it: `representation-contact-log establishment=<registration number> outcome="letter sent" channel=email`.

## The call

Ask for the correspondent by name. Most device exporters have someone who handles FDA work and
reads English; if the person who answers does not, say "FDA, 美国代理人" (FDA, Měiguó dàilǐrén)
and ask for an email address: "请问您的邮箱是？" (Qǐngwèn nín de yóuxiāng shì?).

1. Who you are, in one sentence, and that you sent an email.
2. The renewal: "Your FDA registration renews by December 31. Who is your US agent now, and are
   they easy to reach?"
3. The offer: a named person, same-day forwarding in Chinese, the fee.
4. Ask: "Shall I send the agreement?"

## What they ask

- **"We already have an agent."** Most do. Ask whether their agent forwards FDA messages the
  same day and in Chinese, and whether they have ever had an import held. Changing agents is
  one edit in their FDA registration at renewal.
- **"How do we pay?"** By wire against our invoice; the agreement is the service contract their
  bank asks for.
- **"Can you import for us?"** We do not file customs entries; we introduce a licensed customs
  broker and a US warehouse, and we can sell their products as their representative.
- **"Are you a big company?"** We are a Minnesota group; you reach the person who does the work.

## What to log

Every attempt, with its outcome: no answer, voicemail, letter sent (an email or letter, with its
`channel`), not the right contact, callback (with `callbackAt`), interested, engagement sent
(the agreement sent), not interested, remove. When they say yes:
`representation-screen name="<company>"`, then
`representation-engagement-record client="<company>" establishment=<number> offer=us-agent stage=proposed`,
then `representation-document-draft template=us-agent-service-agreement engagement=<id>`.
