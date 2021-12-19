<template>
  <div class="app-header">
    <div class="app-header-inner">
      <div class="title">
        <h1>
          <router-link to="/" :tag="isSignedIn ? 'a' : 'span'">
            Google Drive Player
          </router-link>
        </h1>
      </div>

      <div class="nav">
        <a
          @click="onClickSignOutBtn"
          v-if="isSignedIn"
          class="nav-link signout-button"
        >
          サインアウト
        </a>

        <a class="nav-link help-btn" @click="onClickHelpBtn">
          <span class="icon material-icons">help_outline</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "@/styles/_variables";
.app-header {
  background-color: $color-main;

  .app-header-inner {
    display: flex;
    align-items: center;
    max-width: $app-max-width;
    margin: 0 auto;
    padding: 12px 24px;
    @media screen and (max-width: 767px) {
      padding: 4px 12px;
    }

    color: #fff;

    .title {
      a,
      span {
        display: block;
        padding: 8px 8px 8px 0;
        font-size: 16px;
        color: #fff;
        font-weight: bold;
        text-decoration: none;
      }
      a {
        &:hover {
          opacity: 0.8;
        }
        &:active {
          opacity: 0.6;
        }
      }
    }

    .nav {
      display: flex;
      align-items: center;
      margin-left: auto;
      font-size: 12px;

      .nav-link {
        cursor: pointer;
        display: block;

        &:hover {
          opacity: 0.8;
        }
        &:active {
          opacity: 0.6;
        }

        &.signout-btn {
          padding: 8px 0 8px 8px;
        }

        &.help-btn {
          margin-left: 16px;
        }
      }
    }
  }
}
</style>

<script lang="ts">
import "reset.css";
import { Component, Vue } from "vue-property-decorator";
import { authService } from "@/services/auth-service";
import { appState } from "@/state/app-state";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION = require("../../package.json").version;

@Component
export default class AppHeader extends Vue {
  get isSignedIn(): boolean {
    return appState.isSignedIn;
  }

  onClickSignOutBtn(): void {
    authService.signout();
  }

  onClickHelpBtn(): void {
    alert(`Google Drive Player\n${APP_VERSION}`);
  }
}
</script>
