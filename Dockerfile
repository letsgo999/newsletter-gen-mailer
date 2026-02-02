FROM node:18-alpine
WORKDIR /app
# 빌드에 필요한 모든 파일을 복사합니다.
COPY . .
# 라이브러리를 설치하고 앱을 빌드합니다.
RUN npm install
RUN npm run build
# 포트 설정
EXPOSE 8080
ENV PORT 8080
# 앱 실행 (Next.js 표준 실행 방식)
CMD ["npm", "start"]
