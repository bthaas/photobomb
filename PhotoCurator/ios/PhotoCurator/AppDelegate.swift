import UIKit
import React

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    
    let jsCodeLocation: URL
    
    #if DEBUG
    if let bundleURL = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index") {
      jsCodeLocation = bundleURL
    } else {
      // Fallback to localhost if Metro isn't running
      jsCodeLocation = URL(string: "http://localhost:8081/index.bundle?platform=ios")!
    }
    #else
    if let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      jsCodeLocation = bundleURL
    } else {
      // This should not happen in production, but provide a fallback
      jsCodeLocation = URL(string: "http://localhost:8081/index.bundle?platform=ios")!
    }
    #endif
    
    let rootView = RCTRootView(bundleURL: jsCodeLocation, moduleName: "PhotoCurator", initialProperties: nil, launchOptions: launchOptions)
    let rootViewController = UIViewController()
    rootViewController.view = rootView
    
    self.window = UIWindow(frame: UIScreen.main.bounds)
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()
    
    return true
  }
}