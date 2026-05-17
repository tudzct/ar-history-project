#import <AVFoundation/AVFoundation.h>

extern "C" void SetIOSAudioSessionPlayback()
{
    AVAudioSession *session = [AVAudioSession sharedInstance];
    NSError *error = nil;

    [session setCategory:AVAudioSessionCategoryPlayback error:&error];
    [session setActive:YES error:&error];
}
