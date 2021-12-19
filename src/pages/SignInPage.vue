<template>
  <div class="page">
    <div class="content">
      <p class="text">
        これはGoogle Drive内の音楽を再生するアプリケーションです。
        利用するためにはGoogleアカウントにサインインしてください。
      </p>
      <div class="signin-btn" ref="googleSignInBtn"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "@/styles/_variables";
.page {
  background-color: $color-main;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $color-white;

  .content {
    padding: 16px 24px;

    .text {
      line-height: 1.8;
      margin-bottom: 12px;
      text-align: left;
    }
    .signin-btn {
      display: inline-block;
      margin: 0 auto;
    }
  }
}
</style>

<script lang="ts">
import { authService } from "@/services/auth-service";
import Vue from "vue";
import Component from "vue-class-component";

@Component
export default class SignInPage extends Vue {
  mounted(): void {
    authService.renderSignInButton(this.$refs.googleSignInBtn as HTMLElement);
  }
}
</script>
