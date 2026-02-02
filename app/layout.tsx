import React from 'react';

export const metadata = {
  title: '뉴스마스터 AI',
  description: '맞춤형 농식품 뉴스 브리핑 서비스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
