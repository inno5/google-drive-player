<template>
  <div class="app">
    <app-header></app-header>
    <div class="app-body">
      <router-view></router-view>
    </div>
  </div>
</template>
<style>
body {
  margin: 0;
  padding: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #333;
  font-size: 12px;
}

a,
button {
  -ms-user-select: none; /* IE 10+ */
  -moz-user-select: -moz-none;
  -khtml-user-select: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>

<style lang="scss" scoped>
@import "/styles/_variables";
.app {
  background-color: $color-white;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  .app-body {
    position: relative;
    height: 100%;
  }
}
</style>

<script lang="ts">
import "reset.css";
import { Component, Vue, Watch } from "vue-property-decorator";
import AppHeader from "@/components/AppHeader.vue";
import { appState } from "./state/app-state";

@Component({
  components: {
    AppHeader,
  },
})
export default class App extends Vue {
  get isSignedIn(): boolean {
    return appState.isSignedIn;
  }

  @Watch("isSignedIn")
  onChangeSignInStatus(): void {
    if (appState.isSignedIn) {
      this.$router.push("/");
    } else {
      this.$router.push("/signin");
    }
  }
}
</script>
