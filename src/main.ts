import Vue from "vue";
import App from "./App.vue";
import router from "./router/router";
import InfiniteLoading from "vue-infinite-loading";
import "./filters/smart-file-size-filter";
import "./filters/time-filter";
import FolderIcon from "vue-material-design-icons/Folder.vue";
import AudiotrackIcon from "vue-material-design-icons/AudioVideo.vue";
import Toasted from "vue-toasted";
import { authService } from "./services/auth-service";

Vue.config.productionTip = false;
Vue.use(InfiniteLoading);
Vue.use(Toasted, { singleton: true });
Vue.component("folder-icon", FolderIcon);
Vue.component("audio-icon", AudiotrackIcon);

authService.init(() => {
  new Vue({
    router,
    render: (h) => h(App),
  }).$mount("#app");
});
