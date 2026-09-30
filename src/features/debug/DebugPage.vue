<script setup lang="ts">
import { onMounted, ref } from "vue";
import { AUTH_TOKEN_STORAGE_KEY, useAuthStore } from "@/features/auth";
import { isStandalone } from "@/shared/lib/platform";
import { clearBootLog, loadBootLog, type BootRecord } from "./boot-log";
import { inspectStorage, type StorageEntry } from "./storage-inspect";

const auth = useAuthStore();
const standalone = isStandalone();
const version = __APP_VERSION__;

const bootLog = ref<BootRecord[]>([]);
const entries = ref<StorageEntry[]>([]);
const now = ref(Date.now());
const persisted = ref("未確認");

function refresh(): void {
  now.value = Date.now();
  // 新しい順に表示する
  bootLog.value = loadBootLog().slice().reverse();
  entries.value = inspectStorage([AUTH_TOKEN_STORAGE_KEY]);
}

function remainingMinutes(): string {
  if (auth.expiresAt === 0) {
    return "-";
  }
  return `${Math.round((auth.expiresAt - now.value) / 60_000)} 分`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function mark(value: boolean | null): string {
  if (value === null) {
    return "-";
  }
  return value ? "○" : "×";
}

async function checkPersisted(): Promise<void> {
  const storage = navigator.storage;
  if (!storage?.persisted) {
    persisted.value = "非対応";
    return;
  }
  persisted.value = (await storage.persisted()) ? "永続化済み" : "未永続化";
}

async function requestPersist(): Promise<void> {
  const storage = navigator.storage;
  if (!storage?.persist) {
    persisted.value = "非対応";
    return;
  }
  persisted.value = (await storage.persist())
    ? "永続化済み（要求が許可された）"
    : "要求は許可されなかった";
}

function onClearBootLog(): void {
  clearBootLog();
  refresh();
}

onMounted(() => {
  refresh();
  void checkPersisted();
});
</script>

<template>
  <div class="debug-page">
    <h2>情報とデバッグ</h2>

    <section>
      <h3>アプリ</h3>
      <dl>
        <dt>バージョン</dt>
        <dd>{{ version }}</dd>
        <dt>ホーム画面アプリとして起動</dt>
        <dd>{{ standalone ? "はい" : "いいえ" }}</dd>
        <dt>永続ストレージ</dt>
        <dd>
          {{ persisted }}
          <button type="button" @click="requestPersist">要求する</button>
        </dd>
      </dl>
    </section>

    <section>
      <h3>認証</h3>
      <dl>
        <dt>状態</dt>
        <dd>{{ auth.status }}</dd>
        <dt>認証ライブラリ上のサインイン</dt>
        <dd>{{ auth.gapiSignedIn ? "済み" : "未サインイン" }}</dd>
        <dt>保存済みトークンで復元</dt>
        <dd>{{ auth.restoredFromStorage ? "はい" : "いいえ" }}</dd>
        <dt>トークンの残り時間</dt>
        <dd>{{ remainingMinutes() }}</dd>
        <dt>エラー</dt>
        <dd>{{ auth.error ?? "-" }}</dd>
      </dl>
    </section>

    <section>
      <h3>起動ログ（新しい順）</h3>
      <p class="note">
        起動 = ページを開いた回数。auth は「初期化直後 → 5 秒後」の認証状態。
      </p>
      <table>
        <thead>
          <tr>
            <th>時刻</th>
            <th>起動元</th>
            <th>keys</th>
            <th>gapi</th>
            <th>token</th>
            <th>auth</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in bootLog" :key="record.time">
            <td>{{ formatTime(record.time) }}</td>
            <td>{{ record.standalone ? "HOME" : "WEB" }}</td>
            <td>{{ record.storageKeys }}</td>
            <td>{{ mark(record.gapiSignedIn) }}</td>
            <td>{{ mark(record.restoredFromStorage) }}</td>
            <td>
              {{ record.statusAfterInit ?? "-" }} →
              {{ record.statusAfter5s ?? "-" }}
            </td>
          </tr>
        </tbody>
      </table>
      <button type="button" @click="refresh">更新</button>
      <button type="button" @click="onClearBootLog">起動ログを消去</button>
    </section>

    <section>
      <h3>localStorage（{{ entries.length }} 件）</h3>
      <table>
        <thead>
          <tr>
            <th>キー</th>
            <th>文字数</th>
            <th>値（先頭）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.key">
            <td>{{ entry.key }}</td>
            <td>{{ entry.length }}</td>
            <td>{{ entry.hidden ? "（非表示）" : entry.preview }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.debug-page {
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: 12px 16px 48px;
  text-align: left;
}

h2 {
  margin: 0 0 12px;
  font-size: 16px;
}

h3 {
  margin: 20px 0 8px;
  font-size: 13px;
}

dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 0;
}

dt {
  color: #666;
}

dd {
  margin: 0;
  word-break: break-all;
}

.note {
  margin: 0 0 8px;
  color: #666;
}

table {
  width: 100%;
  margin-bottom: 8px;
  border-collapse: collapse;
}

th,
td {
  padding: 4px 6px;
  border-bottom: 1px solid #ddd;
  text-align: left;
  word-break: break-all;
}

button {
  margin-right: 8px;
  padding: 4px 10px;
}
</style>
