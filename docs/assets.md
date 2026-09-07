# 자산과 출처

| 자산                          | 생성 방식 / 출처                                                        | 배포                                      |
| ----------------------------- | ----------------------------------------------------------------------- | ----------------------------------------- |
| 4개 캐릭터, 장비, 강체 관절   | 이 저장소 `src/models.js`에서 새로 모델링                               | 원본 코드 포함                            |
| 성채·숲·비행선 무대           | `src/stages.js` 절차적 메시                                             | 원본 코드 포함                            |
| 벽돌·기와·목재·풀 64px 텍스처 | `src/stages.js`의 고정 seed Canvas 패턴                                 | 런타임 로컬 생성                          |
| 초상·무대 썸네일              | 실제 게임 메시를 Three.js로 렌더링                                      | 런타임 로컬 생성                          |
| 공격·방어·KO 입자와 선수 표식 | 자체 기하·Canvas 문자                                                   | 런타임 로컬 생성                          |
| 소리                          | `src/audio.js` Web Audio 오실레이터                                     | 음원 다운로드 없음                        |
| Galmuri11 2.40.3              | [Galmuri](https://github.com/quiple/galmuri), SIL Open Font License 1.1 | npm으로 설치, WOFF2 한 파일만 빌드에 포함 |
| Three.js 0.179.1              | [Three.js](https://github.com/mrdoob/three.js), MIT                     | npm 의존성                                |
| Vite 8.2.2                    | [Vite](https://github.com/vitejs/vite), MIT                             | 개발 의존성                               |

외부 이미지·음악·모델을 호출하는 런타임 URL은 없다. AI 이미지 생성은 이 게임에서는 사용하지 않았다. 편집 가능한 저폴리 메시와 반복 텍스처가 목적이어서 코드 기반 제작을 선택했다. Blender나 기존 모음집 GLB 역시 사용하지 않았다.

배포 빌드에는 `public/licenses/Galmuri-OFL.txt`와 `public/licenses/Three-MIT.txt`의 저작권·라이선스 사본을 포함한다.

Nintendo의 공식 페이지와 스크린샷은 비교·관찰용 링크만 제공하며 저장소에 이미지 파일을 복사하지 않는다. 출처와 관찰 내용은 [아트 디렉션](art-direction.md)에 있다. Nintendo, HAL Laboratory 또는 원작 제작사와 관계없는 비공식 패러디다.
