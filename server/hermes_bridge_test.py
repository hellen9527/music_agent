import importlib.util
import pathlib
import unittest


BRIDGE_PATH = pathlib.Path(__file__).with_name("hermes_bridge.py")
SPEC = importlib.util.spec_from_file_location("hermes_bridge", BRIDGE_PATH)
hermes_bridge = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hermes_bridge)


class MusicRouterPromptTest(unittest.TestCase):
    def test_music_router_system_message_includes_intents_and_output_rules(self):
        message = hermes_bridge.build_system_message(
            "保持中文回复。", mode="music_router"
        )

        self.assertIn("保持中文回复。", message)
        self.assertIn("音乐领域意图路由 Agent", message)
        self.assertIn("精准搜索", message)
        self.assertIn("推荐", message)
        self.assertIn("随机推荐", message)
        self.assertIn("AI搜索", message)
        self.assertIn("操控", message)
        self.assertIn("资产查询", message)
        self.assertIn("榜单", message)
        self.assertIn("任务编排", message)
        self.assertIn("闲聊", message)
        self.assertIn("最终答案必须只输出 JSON", message)

    def test_music_router_prompt_keeps_fresh_entity_expansion_out_of_recommendation(self):
        message = hermes_bridge.build_system_message(None, mode="music_router")

        self.assertIn("music_recommend 没有联网搜索能力", message)
        self.assertIn("地域/身份/群体 + 新歌", message)
        self.assertIn("想找点台湾歌手的新歌来听", message)
        self.assertIn('"type": "task_plan"', message)
        self.assertIn('"skill": "ai_search"', message)
        self.assertIn('"skill": "music_search"', message)


if __name__ == "__main__":
    unittest.main()
