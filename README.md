# whats this? 📖
[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)

For my work/job, as an Information-Communication Technology Supporter for Elementary School（in Japanese, ICT支援員）, Searching Application for Library collection by Google Apps Script.

小学生が初めて図書室・図書館を使用する前に、蔵書検索の体験ができたらいいなということで、ICT支援員の支援業務の一貫として作ろうとしてます（WIP）　

幸いにして[Workspace for Education](https://edu.google.co.jp/intl/en_ALL/workspace-for-education/editions/overview/)を導入しているようなので、「Google標準ツールだったら文句無いだろう」ということでGoogle Apps Scriptで作成しています。Google Apps Script自体はGoogleアカウントがあれば今のところ誰でも使えるので、導入してない環境でも使えることは使える（ただしGoogle側の仕様により、アプリをデプロイしたりファイルを共有したりするときに「組織内に限定」のような機能は使えないし、API実行の制限があったり、デプロイしたWebアプリのウインドウ上部にメッセージが出たり、いろいろ制約がある）。別に組織アカウントで使う必要はなく、個人のアカウント内でもふつうに使えます

# Disclaimer
This work is only intended to provide a library search experience and cannot replace existing commercial systems. Operation of the system must be done at your own risk and discretion. I assume no responsibility whatsoever for the results of the operation.

蔵書検索の体験を提供する目的なので、商用のシステムの代替にはなり得ません。「GIGA端末で図書室の蔵書を検索したい！Workspace for Education契約しているからこれでいいや！」とはなりません。

このGoogle Apps Scriptでは[openBD](https://openbd.jp/)を使用しています。API提供・開発元の[株式会社カーリル](https://calil.jp/company/)様では、2022年9月5日より（2022年09月11日時点で『永続的』に）「[カーリル 学校図書館支援プログラム](https://blog.calil.jp/2022/09/gk.html)」を提供しておられます。

（このGoogle Apps Scriptは現在の日本国内のGIGAスクール端末・学校環境という限定的な条件下での、特定の学校環境を想定し、一ICT支援員による支援の一環として作成しました）

# requirements
- Google account(free/Workspace)
- bassically knowledge for Web development and Google Apps Script
  -  これらの説明はしません


# installation
最も簡単な方法はSpreadSheetをContainer-bound Scriptごとコピーし、デプロイするやり方です。`clasp`を使ってローカルにcloneし、任意の（自分の）SpreadSheetにpushしてもいいです。わからなかったらコピペでもいいと思います。

# LICENSE
BSD3