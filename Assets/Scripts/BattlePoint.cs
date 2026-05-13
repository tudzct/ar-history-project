using UnityEngine;
using UnityEngine.Video;

public class BattlePoint : MonoBehaviour
{
    public string battleName;

    [TextArea(2, 5)]
    public string description;

    public VideoClip videoClip;
}