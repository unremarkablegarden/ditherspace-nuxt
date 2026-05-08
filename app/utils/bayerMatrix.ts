export const BAYER_8X8 = new Float32Array([
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]).map((v) => v / 64)

export const BAYER_8X8_GLSL = /* glsl */ `
float bayer8x8(vec2 pos) {
    int x = int(mod(pos.x, 8.0)); int y = int(mod(pos.y, 8.0));
    int idx = y * 8 + x;
    if (idx==0) return 0.0/64.0; else if (idx==1) return 32.0/64.0;
    else if (idx==2) return 8.0/64.0; else if (idx==3) return 40.0/64.0;
    else if (idx==4) return 2.0/64.0; else if (idx==5) return 34.0/64.0;
    else if (idx==6) return 10.0/64.0; else if (idx==7) return 42.0/64.0;
    else if (idx==8) return 48.0/64.0; else if (idx==9) return 16.0/64.0;
    else if (idx==10) return 56.0/64.0; else if (idx==11) return 24.0/64.0;
    else if (idx==12) return 50.0/64.0; else if (idx==13) return 18.0/64.0;
    else if (idx==14) return 58.0/64.0; else if (idx==15) return 26.0/64.0;
    else if (idx==16) return 12.0/64.0; else if (idx==17) return 44.0/64.0;
    else if (idx==18) return 4.0/64.0; else if (idx==19) return 36.0/64.0;
    else if (idx==20) return 14.0/64.0; else if (idx==21) return 46.0/64.0;
    else if (idx==22) return 6.0/64.0; else if (idx==23) return 38.0/64.0;
    else if (idx==24) return 60.0/64.0; else if (idx==25) return 28.0/64.0;
    else if (idx==26) return 52.0/64.0; else if (idx==27) return 20.0/64.0;
    else if (idx==28) return 62.0/64.0; else if (idx==29) return 30.0/64.0;
    else if (idx==30) return 54.0/64.0; else if (idx==31) return 22.0/64.0;
    else if (idx==32) return 3.0/64.0; else if (idx==33) return 35.0/64.0;
    else if (idx==34) return 11.0/64.0; else if (idx==35) return 43.0/64.0;
    else if (idx==36) return 1.0/64.0; else if (idx==37) return 33.0/64.0;
    else if (idx==38) return 9.0/64.0; else if (idx==39) return 41.0/64.0;
    else if (idx==40) return 51.0/64.0; else if (idx==41) return 19.0/64.0;
    else if (idx==42) return 59.0/64.0; else if (idx==43) return 27.0/64.0;
    else if (idx==44) return 49.0/64.0; else if (idx==45) return 17.0/64.0;
    else if (idx==46) return 57.0/64.0; else if (idx==47) return 25.0/64.0;
    else if (idx==48) return 15.0/64.0; else if (idx==49) return 47.0/64.0;
    else if (idx==50) return 7.0/64.0; else if (idx==51) return 39.0/64.0;
    else if (idx==52) return 13.0/64.0; else if (idx==53) return 45.0/64.0;
    else if (idx==54) return 5.0/64.0; else if (idx==55) return 37.0/64.0;
    else if (idx==56) return 63.0/64.0; else if (idx==57) return 31.0/64.0;
    else if (idx==58) return 55.0/64.0; else if (idx==59) return 23.0/64.0;
    else if (idx==60) return 61.0/64.0; else if (idx==61) return 29.0/64.0;
    else if (idx==62) return 53.0/64.0; else return 21.0/64.0;
}
`
