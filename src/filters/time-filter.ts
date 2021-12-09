import Vue from "vue";

Vue.filter("time", function (milliseconds: number) {
  const h = Math.floor(milliseconds / (60 * 60));
  milliseconds -= h * 60 * 60;
  const m = Math.floor(milliseconds / 60);
  milliseconds -= m * 60;
  const s = Math.floor(milliseconds);

  const hStr = `${h}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  const sStr = s < 10 ? `0${s}` : `${s}`;

  if (h > 0) {
    return `${hStr}:${mStr}:${sStr}`;
  } else {
    return `${mStr}:${sStr}`;
  }
});
