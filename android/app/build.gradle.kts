plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "haus.maxpfennig.offscreen"
    compileSdk = 36
    defaultConfig {
        applicationId = "haus.maxpfennig.offscreen"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/radioAssets"))
    testOptions { unitTests.isIncludeAndroidResources = true }
}
val prepareRadioAssets by tasks.registering(Exec::class) {
    workingDir(rootProject.projectDir.parentFile)
    commandLine("python3", "android/prepare-assets.py", layout.buildDirectory.dir("generated/radioAssets").get().asFile.absolutePath)
    inputs.files(fileTree(rootProject.projectDir.parentFile) {
        include("index.html", "theme.js", "programme.json", "stations.json", "assets/**", "android/web/**")
    })
    outputs.dir(layout.buildDirectory.dir("generated/radioAssets"))
}
tasks.named("preBuild").configure { dependsOn(prepareRadioAssets) }
dependencies {
    implementation("androidx.media3:media3-exoplayer:1.9.3")
    implementation("androidx.media3:media3-session:1.9.3")
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.core:core-ktx:1.17.0")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:core-ktx:1.6.1")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20250517")
}
